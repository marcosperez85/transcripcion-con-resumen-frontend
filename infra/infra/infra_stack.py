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
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_route53_targets as targets,
)



class FrontendInfraStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        domain_name = "sonitext.com"
        www_domain = f"www.{domain_name}"

        hosted_zone = route53.HostedZone.from_lookup(
            self,
            "HostedZone",
            domain_name=domain_name
        )

        # Se utiliza DnsValidatedCertificate para que CDK añada automáticamente
        # los registros CNAME de validación en Route53.
        certificate = acm.DnsValidatedCertificate(
            self,
            "SiteCertificate",
            domain_name=domain_name,
            subject_alternative_names=[www_domain],
            hosted_zone=hosted_zone,
            region="us-east-1",
        )

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
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED
                )
            },
            domain_names=[domain_name, www_domain],
            certificate=certificate,
        )

        route53.ARecord(
            self,
            "AliasRecord",
            zone=hosted_zone,
            record_name=domain_name,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        route53.ARecord(
            self,
            "WwwAliasRecord",
            zone=hosted_zone,
            record_name=www_domain,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        # 🟢 Registro para la tienda en Lemon Squeezy
        route53.ARecord(
            self,
            "ShopLemonRecord",
            zone=hosted_zone,
            record_name="shop", # Esto crea shop.sonitext.com
            target=route53.RecordTarget.from_ip_addresses("3.33.255.208"),
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