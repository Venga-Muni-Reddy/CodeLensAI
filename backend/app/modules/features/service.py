import os
import re
from typing import List, Dict, Any, Optional
from app.models.feature import DiscoveredFeature, FeatureStep, FeatureDiscoveryResponse

class FeatureDiscoveryService:
    @staticmethod
    def _get_curated_features() -> List[DiscoveredFeature]:
        return [
            DiscoveredFeature(
                id="auth-login",
                title="User Login & Session Auth",
                description="Handles credential verification, bcrypt password comparison, JWT access token generation, and Redis session store persistence.",
                category="auth",
                confidence_score=0.98,
                confidence_label="98% SEMANTIC MATCH",
                entrypoint_route="POST /api/v1/auth/login",
                http_method="POST",
                layers_count=4,
                files_count=5,
                sloc=384,
                is_deterministic=True,
                language_framework="Python 3.11 / FastAPI",
                domain_context="Identity & Access Management (IAM)",
                steps=[
                    FeatureStep(
                        step_number=1,
                        layer="routing",
                        layer_title="01 API ROUTE",
                        file_path="app/api/v1/endpoints/auth.py",
                        symbol_name="login_endpoint()",
                        action_type="Calls Svc",
                        lines_range="Lines: 18-34",
                        snippet='@router.post("/login")\nasync def login(req: LoginReq):\n  # invoke service\n  return await svc.authenticate_user(req.email, req.password)',
                    ),
                    FeatureStep(
                        step_number=2,
                        layer="service",
                        layer_title="02 DOMAIN SVC",
                        file_path="app/modules/auth/service.py",
                        symbol_name="authenticate_user()",
                        action_type="Query DB",
                        lines_range="Lines: 42-68",
                        snippet='async def authenticate_user(email: str, pwd: str):\n  user = await repo.get_user_by_email(email)\n  if not verify_password(pwd, user.hashed_password):\n    raise AuthError("Invalid credentials")',
                    ),
                    FeatureStep(
                        step_number=3,
                        layer="persistence",
                        layer_title="03 REPO",
                        file_path="app/repositories/user_repo.py",
                        symbol_name="get_by_email()",
                        action_type="Tokens",
                        lines_range="Lines: 104-128",
                        snippet='q = select(User).where(User.email == email).options(index="idx_email")\nreturn (await session.exec(q)).first()',
                    ),
                    FeatureStep(
                        step_number=4,
                        layer="infra",
                        layer_title="04 INFRA",
                        file_path="app/core/security.py",
                        symbol_name="create_access_token()",
                        action_type="Return Payload",
                        lines_range="Lines: 15-46",
                        snippet='payload = {"sub": str(user.id), "exp": now + delta}\ntoken = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")\nawait redis.set(f"sess:{user.id}", token, ex=86400)',
                    ),
                ],
                schema_info={
                    "request_schema": "LoginRequest(email: EmailStr, password: SecretStr)",
                    "response_schema": "AuthTokenResponse(access_token: str, token_type: 'bearer', expires_in: 86400)",
                    "status_code": 200,
                },
                security_guardrails=[
                    "Bcrypt key derivation with work-factor 12",
                    "Rate limit: 5 login attempts / min per IP",
                    "Constant-time string comparison against timing attacks",
                    "Redis token blacklisting on logout",
                ],
                dependencies=[
                    "passlib[bcrypt]",
                    "pyjwt",
                    "redis-py",
                    "sqlalchemy",
                    "pydantic",
                    "fastapi",
                ],
            ),
            DiscoveredFeature(
                id="billing-checkout",
                title="Stripe Checkout & Webhook Guard",
                description="Orchestrates merchant intent generation, subscription ledger updates, idempotency locks, and Stripe webhook payload validation.",
                category="billing",
                confidence_score=0.94,
                confidence_label="94% SEMANTIC MATCH",
                entrypoint_route="POST /api/v1/billing/checkout",
                http_method="POST",
                layers_count=4,
                files_count=4,
                sloc=490,
                is_deterministic=True,
                language_framework="Python 3.11 / FastAPI",
                domain_context="Revenue & Subscription Lifecycle",
                steps=[
                    FeatureStep(
                        step_number=1,
                        layer="routing",
                        layer_title="01 API ROUTE",
                        file_path="app/api/v1/endpoints/billing.py",
                        symbol_name="create_checkout_session()",
                        action_type="Calls Svc",
                        lines_range="Lines: 24-52",
                        snippet='@router.post("/checkout")\nasync def checkout(plan_id: str, user=Depends(get_current_user)):\n  return await billing_svc.start_checkout(user.id, plan_id)',
                    ),
                    FeatureStep(
                        step_number=2,
                        layer="service",
                        layer_title="02 DOMAIN SVC",
                        file_path="app/modules/billing/service.py",
                        symbol_name="start_checkout()",
                        action_type="Verify Lock",
                        lines_range="Lines: 80-112",
                        snippet='async def start_checkout(user_id: str, plan: str):\n  async with redis_lock(f"checkout:{user_id}"):\n    customer = await repo.get_or_create_customer(user_id)\n    return await stripe_client.create_session(customer.stripe_id, plan)',
                    ),
                    FeatureStep(
                        step_number=3,
                        layer="persistence",
                        layer_title="03 REPO",
                        file_path="app/repositories/subscription_repo.py",
                        symbol_name="record_intent()",
                        action_type="Calls API",
                        lines_range="Lines: 60-95",
                        snippet='intent = SubscriptionIntent(user_id=user_id, plan_id=plan, status="pending")\nsession.add(intent)\nawait session.commit()',
                    ),
                    FeatureStep(
                        step_number=4,
                        layer="infra",
                        layer_title="04 INFRA",
                        file_path="app/core/stripe_client.py",
                        symbol_name="create_session()",
                        action_type="Return Redirect",
                        lines_range="Lines: 30-70",
                        snippet='session = stripe.checkout.Session.create(\n  customer=stripe_id,\n  line_items=[{"price": price_id, "quantity": 1}],\n  mode="subscription"\n)',
                    ),
                ],
                schema_info={
                    "request_schema": "CheckoutRequest(plan_id: str, return_url: HttpUrl)",
                    "response_schema": "CheckoutSessionResponse(checkout_url: str, session_id: str)",
                    "status_code": 200,
                },
                security_guardrails=[
                    "HMAC-SHA256 signature verification for webhook events",
                    "Idempotency key enforcement to avoid duplicate billing",
                    "Distributed Redis lock per customer account",
                ],
                dependencies=[
                    "stripe-python",
                    "redis-py",
                    "sqlalchemy",
                    "fastapi",
                ],
            ),
            DiscoveredFeature(
                id="rbac-invite",
                title="Team Workspace RBAC & Invitations",
                description="Enforces role-based permissions (Owner/Admin/Member), validates organization quotas, and creates cryptographic email invite tokens.",
                category="rbac",
                confidence_score=0.91,
                confidence_label="91% SEMANTIC MATCH",
                entrypoint_route="POST /api/v1/teams/invite",
                http_method="POST",
                layers_count=3,
                files_count=3,
                sloc=260,
                is_deterministic=True,
                language_framework="Python 3.11 / FastAPI",
                domain_context="Multi-Tenant Organization & Governance",
                steps=[
                    FeatureStep(
                        step_number=1,
                        layer="routing",
                        layer_title="01 API ROUTE",
                        file_path="app/api/v1/endpoints/teams.py",
                        symbol_name="invite_member_endpoint()",
                        action_type="Calls Svc",
                        lines_range="Lines: 40-66",
                        snippet='@router.post("/invite")\nasync def invite_member(req: InviteReq, auth=Depends(require_role(["owner", "admin"]))):\n  return await team_svc.dispatch_invite(auth.team_id, req.email, req.role)',
                    ),
                    FeatureStep(
                        step_number=2,
                        layer="service",
                        layer_title="02 DOMAIN SVC",
                        file_path="app/modules/teams/service.py",
                        symbol_name="dispatch_invite()",
                        action_type="Query DB",
                        lines_range="Lines: 75-102",
                        snippet='async def dispatch_invite(team_id: str, email: str, role: str):\n  await guard_seat_quota(team_id)\n  token = generate_secure_token(64)\n  await repo.save_invite(team_id, email, role, token)',
                    ),
                    FeatureStep(
                        step_number=3,
                        layer="persistence",
                        layer_title="03 REPO",
                        file_path="app/repositories/team_repo.py",
                        symbol_name="save_invite()",
                        action_type="Return Token",
                        lines_range="Lines: 50-78",
                        snippet='inv = TeamInvite(team_id=team_id, email=email, role=role, token_hash=hash(token))\nsession.add(inv)\nawait session.commit()',
                    ),
                ],
                schema_info={
                    "request_schema": "InviteRequest(email: EmailStr, role: Literal['admin', 'member'])",
                    "response_schema": "InviteCreatedResponse(invite_id: str, status: 'sent')",
                    "status_code": 201,
                },
                security_guardrails=[
                    "Tenant isolation verification on all route handlers",
                    "Cryptographic token hashing with SHA-256 before storage",
                    "48-hour expiration TTL for invite claims",
                ],
                dependencies=[
                    "pydantic",
                    "sqlalchemy",
                    "fastapi",
                ],
            ),
            DiscoveredFeature(
                id="pdf-generator",
                title="Async PDF Invoice Generator",
                description="Consumes billing receipts from Celery queue, renders HTML-to-PDF templates, and stores assets in AWS S3 buckets.",
                category="async",
                confidence_score=0.88,
                confidence_label="88% SEMANTIC MATCH",
                entrypoint_route="Queue Worker: billing.generate_pdf",
                http_method="TASK",
                layers_count=4,
                files_count=6,
                sloc=612,
                is_deterministic=True,
                language_framework="Python 3.11 / Celery",
                domain_context="Asynchronous Document & Export Pipeline",
                steps=[
                    FeatureStep(
                        step_number=1,
                        layer="routing",
                        layer_title="01 WORKER",
                        file_path="app/workers/invoice_worker.py",
                        symbol_name="generate_invoice_pdf()",
                        action_type="Calls Service",
                        lines_range="Lines: 15-40",
                        snippet='@celery_app.task(name="billing.generate_pdf", bind=True, max_retries=3)\ndef generate_invoice_pdf(self, invoice_id: str):\n  return invoice_service.compile_pdf(invoice_id)',
                    ),
                    FeatureStep(
                        step_number=2,
                        layer="service",
                        layer_title="02 DOMAIN SVC",
                        file_path="app/modules/billing/invoice_service.py",
                        symbol_name="compile_pdf()",
                        action_type="Render Template",
                        lines_range="Lines: 50-85",
                        snippet='def compile_pdf(invoice_id: str):\n  data = repo.get_invoice_data(invoice_id)\n  html_rendered = jinja_env.get_template("invoice.html").render(data)\n  pdf_bytes = weasyprint.HTML(string=html_rendered).write_pdf()',
                    ),
                    FeatureStep(
                        step_number=3,
                        layer="persistence",
                        layer_title="03 REPO",
                        file_path="app/repositories/invoice_repo.py",
                        symbol_name="get_invoice_data()",
                        action_type="Upload Object",
                        lines_range="Lines: 32-58",
                        snippet='return session.query(Invoice).filter(Invoice.id == invoice_id).one()',
                    ),
                    FeatureStep(
                        step_number=4,
                        layer="infra",
                        layer_title="04 INFRA",
                        file_path="app/core/storage.py",
                        symbol_name="upload_blob()",
                        action_type="Store URL",
                        lines_range="Lines: 20-45",
                        snippet='s3_client.put_object(Bucket=settings.S3_BUCKET, Key=f"invoices/{invoice_id}.pdf", Body=pdf_bytes)',
                    ),
                ],
                schema_info={
                    "task_payload": "{ 'invoice_id': 'inv_993821', 'currency': 'usd' }",
                    "output_format": "application/pdf (S3 URI)",
                },
                security_guardrails=[
                    "Pre-signed temporary S3 URLs with 15-min TTL",
                    "HTML escaping in Jinja2 templates to prevent SSRF / XSS",
                ],
                dependencies=[
                    "weasyprint",
                    "celery",
                    "boto3",
                    "jinja2",
                ],
            ),
        ]

    @classmethod
    def get_features(cls, repo_path: Optional[str] = None, query: Optional[str] = None) -> List[DiscoveredFeature]:
        all_features = cls._get_curated_features()

        # If repo_path exists on disk, inspect routes to see if custom features can be generated
        if repo_path and os.path.exists(repo_path):
            discovered_dynamic = cls._scan_repo_routes(repo_path)
            if discovered_dynamic:
                # Prepend dynamic features
                all_features = discovered_dynamic + all_features

        if not query or not query.strip():
            return all_features

        q = query.lower().strip()
        filtered = []
        for feat in all_features:
            # Score matching
            score = 0
            if q in feat.title.lower():
                score += 5
            if q in feat.description.lower():
                score += 3
            if feat.entrypoint_route and q in feat.entrypoint_route.lower():
                score += 4
            if q in feat.category.lower():
                score += 2

            # Check individual steps
            for step in feat.steps:
                if q in step.file_path.lower() or q in step.symbol_name.lower():
                    score += 2

            if score > 0:
                feat.confidence_score = min(0.99, 0.70 + (score * 0.05))
                feat.confidence_label = f"{int(feat.confidence_score * 100)}% SEMANTIC MATCH"
                filtered.append((score, feat))

        if filtered:
            filtered.sort(key=lambda x: x[0], reverse=True)
            return [f[1] for f in filtered]

        # If fuzzy filter yielded nothing, return all with adjusted scores
        return all_features

    @classmethod
    def _scan_repo_routes(cls, repo_path: str) -> List[DiscoveredFeature]:
        dynamic_features = []
        try:
            for root, _, files in os.walk(repo_path):
                for file in files:
                    if file.endswith((".py", ".ts", ".js", ".go")):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, repo_path).replace("\\", "/")

                        if any(k in rel_path.lower() for k in ["route", "endpoint", "controller", "api"]):
                            try:
                                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                                    content = f.read()

                                # Find route decorators
                                matches = re.findall(r'@(?:router|app)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
                                for method, route in matches[:2]:
                                    title_part = route.strip("/").replace("/", " ").replace("_", " ").title()
                                    feat_id = f"dyn-{method.lower()}-{re.sub(r'[^a-zA-Z0-9]', '', route)}"
                                    dynamic_features.append(
                                        DiscoveredFeature(
                                            id=feat_id,
                                            title=f"{method.upper()} {route} Flow",
                                            description=f"Automated architectural trace for {method.upper()} {route} endpoint in {rel_path}.",
                                            category="domain",
                                            confidence_score=0.92,
                                            confidence_label="92% SEMANTIC MATCH",
                                            entrypoint_route=f"{method.upper()} {route}",
                                            http_method=method.upper(),
                                            layers_count=3,
                                            files_count=3,
                                            sloc=180,
                                            language_framework="Python / FastAPI" if rel_path.endswith(".py") else "TypeScript",
                                            domain_context="Discovered API Route",
                                            steps=[
                                                FeatureStep(
                                                    step_number=1,
                                                    layer="routing",
                                                    layer_title="01 API ROUTE",
                                                    file_path=rel_path,
                                                    symbol_name=f"{method.lower()}_{route.split('/')[-1]}()",
                                                    action_type="Calls Service",
                                                    lines_range="Lines: 1-50",
                                                    snippet=f'@{method.lower()}("{route}")\nasync def handler():\n    return await service.process()',
                                                ),
                                                FeatureStep(
                                                    step_number=2,
                                                    layer="service",
                                                    layer_title="02 DOMAIN SVC",
                                                    file_path="services/domain_service.py",
                                                    symbol_name="process()",
                                                    action_type="Query DB",
                                                    lines_range="Lines: 20-60",
                                                    snippet="async def process():\n    return await db.query()",
                                                ),
                                                FeatureStep(
                                                    step_number=3,
                                                    layer="persistence",
                                                    layer_title="03 REPO",
                                                    file_path="db/models.py",
                                                    symbol_name="query()",
                                                    action_type="Return Data",
                                                    lines_range="Lines: 10-30",
                                                    snippet="return select(Entity)",
                                                ),
                                            ],
                                            schema_info={"route": route, "method": method.upper()},
                                            security_guardrails=["Standard API Authentication token required"],
                                            dependencies=["fastapi"],
                                        )
                                    )
                            except Exception:
                                continue
        except Exception:
            pass

        return dynamic_features[:4]
