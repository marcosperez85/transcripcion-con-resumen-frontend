from pathlib import Path
from constructs import Construct
from aws_cdk import (
    Stack, CfnOutput,
    RemovalPolicy,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3_deployment as s3deploy,
)

class FrontendInfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Resolver repo root desde este archivo: /repo/infra/infra/infra_stack.py -> parents[2] = /repo
        repo_root = Path(__file__).resolve().parents[2]
        site_path = (repo_root / "frontend" / "dist").resolve()
        
        bucket_name="transcripcion-con-resumen-frontend"

        # Guardas claras
        if not site_path.exists() or not (site_path / "index.html").exists():
            raise FileNotFoundError(
                f"No se encontró un build válido en: {site_path}\n"
                "Ejecutá 'npm run build' desde la raíz (o 'npm run deploy' que ya lo hace)."
            )        

        # Bucket privado (sirve vía CloudFront)
        website_bucket = s3.Bucket(
            self, "WebsiteBucket",
            bucket_name=bucket_name,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # CloudFront con origen S3
        distribution = cloudfront.Distribution(
            self, "WebsiteDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(website_bucket)
            ),
            default_root_object="index.html",
        )

        # Deploy de /frontend/dist al bucket + invalidación en CF
        s3deploy.BucketDeployment(
            self, "DeployWebsite",
            destination_bucket=website_bucket,
            sources=[s3deploy.Source.asset(str(site_path))],
            distribution=distribution,
            distribution_paths=["/*"],
        )

        CfnOutput(self, "CloudFrontURL",
                  value=f"https://{distribution.domain_name}",
                  description="URL pública del sitio")
        
        CfnOutput(self, "DistributionId",
                  value=distribution.distribution_id)
        
        CfnOutput(self, "BucketName",
                  value=website_bucket.bucket_name)
