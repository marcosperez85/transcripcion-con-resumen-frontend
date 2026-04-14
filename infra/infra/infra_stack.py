from pathlib import Path
from constructs import Construct
from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3_deployment as s3deploy,
)

class FrontendInfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Resolve repo root
        repo_root = Path(__file__).resolve().parents[2]
        site_path = (repo_root / "frontend" / "dist").resolve()

        bucket_name = f"transcripcion-con-resumen-frontend-{self.account}-{self.region}"

        # Validate build exists
        if not site_path.exists() or not (site_path / "index.html").exists():
            raise FileNotFoundError(
                f"No se encontró un build válido en: {site_path}\n"
                "Ejecutá 'npm run build'."
            )

        # 🟢 1. CloudFront Function (replaces Lambda@Edge)
        auth_function = cloudfront.Function(
            self,
            "AuthFunction",
            code=cloudfront.FunctionCode.from_inline("""
function handler(event) {
    var request = event.request;
    var headers = request.headers;

    // Check for token (cookie OR Authorization header)
    if (!headers.authorization && !headers.cookie) {
        return {
            statusCode: 302,
            statusDescription: 'Redirect to login',
            headers: {
                location: { value: '/login.html' }
            }
        };
    }

    return request;
}
""")
        )

        # 🟢 2. Private S3 bucket
        website_bucket = s3.Bucket(
            self,
            "WebsiteBucket",
            bucket_name=bucket_name,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # 🟢 3. CloudFront distribution
        distribution = cloudfront.Distribution(
            self,
            "Web",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(website_bucket),
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            default_root_object="index.html",
            additional_behaviors={
                "/pages/*": cloudfront.BehaviorOptions(
                    origin=origins.S3Origin(website_bucket),
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    function_associations=[
                        cloudfront.FunctionAssociation(
                            function=auth_function,
                            event_type=cloudfront.FunctionEventType.VIEWER_REQUEST
                        )
                    ]
                )
            },
        )

        # 🟢 4. Deploy frontend build
        s3deploy.BucketDeployment(
            self,
            "DeployWebsite",
            destination_bucket=website_bucket,
            sources=[s3deploy.Source.asset(str(site_path))],
            distribution=distribution,
            distribution_paths=["/*"],
        )

        # Outputs
        CfnOutput(
            self,
            "CloudFrontURL",
            value=f"https://{distribution.domain_name}",
            description="URL pública del sitio",
        )

        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(self, "BucketName", value=website_bucket.bucket_name)