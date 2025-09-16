from pathlib import Path
from constructs import Construct
from aws_cdk.aws_cloudfront.experimental import EdgeFunction
from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3_deployment as s3deploy,
    aws_lambda as _lambda,
    aws_cloudfront_origins as origins,
)

class FrontendInfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)              

        # Resolver repo root desde este archivo: /repo/infra/infra/infra_stack.py -> parents[2] = /repo
        repo_root = Path(__file__).resolve().parents[2]
        site_path = (repo_root / "frontend" / "dist").resolve()

        bucket_name = f"transcripcion-con-resumen-frontend-{self.account}-{self.region}"

        # Guardas claras
        if not site_path.exists() or not (site_path / "index.html").exists():
            raise FileNotFoundError(
                f"No se encontró un build válido en: {site_path}\n"
                "Ejecutá 'npm run build' desde la raíz (o 'npm run deploy' que ya lo hace)."
            )

        # 1) Crear la función de autenticación en el Edge (Node 18 recomendado)
        # Instalar y compilar (desde la carpeta infra/lambda/auth-edge) con npm install && npm run build
        edge_fn = EdgeFunction(
            self,
            "AuthAtEdge",
            runtime=_lambda.Runtime.NODEJS_18_X,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda/auth-edge/dist"),  # tu bundle
        )

        # Bucket privado (sirve vía CloudFront)
        website_bucket = s3.Bucket(
            self,
            "WebsiteBucket",
            bucket_name=bucket_name,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # CloudFront con origen S3
        distribution = cloudfront.Distribution(
            self, "Web",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(website_bucket),
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            default_root_object="index.html",
            additional_behaviors={
                "/pages/*": cloudfront.BehaviorOptions(
                    origin=origins.S3Origin(website_bucket),
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    edge_lambdas=[
                        cloudfront.EdgeLambda(
                            function_version=edge_fn.current_version,
                            event_type=cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                            include_body=False,
                        )
                    ],
                )
            },
        )

        # Deploy de /frontend/dist al bucket + invalidación en CF
        s3deploy.BucketDeployment(
            self,
            "DeployWebsite",
            destination_bucket=website_bucket,
            sources=[s3deploy.Source.asset(str(site_path))],
            distribution=distribution,
            distribution_paths=["/*"],
        )

        CfnOutput(
            self,
            "CloudFrontURL",
            value=f"https://{distribution.domain_name}",
            description="URL pública del sitio",
        )

        CfnOutput(self, "DistributionId", value=distribution.distribution_id)

        CfnOutput(self, "BucketName", value=website_bucket.bucket_name)
