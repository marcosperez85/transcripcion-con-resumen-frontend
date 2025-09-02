#!/usr/bin/env python3
import os
import aws_cdk as cdk
from infra.infra_stack import FrontendInfraStack  # noqa

app = cdk.App()

account = os.environ.get("CDK_DEFAULT_ACCOUNT")
region = os.environ.get("CDK_DEFAULT_REGION")

FrontendInfraStack(
    app, "FrontendInfra",
    env=cdk.Environment(account=account, region=region),
)

app.synth()
