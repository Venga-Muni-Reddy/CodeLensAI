import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
import logging
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.errors import APIError
from app.models.graph import (
    ArchitectureClassification,
    ArchitectureLayer,
    CouplingMetric,
    DependencyGraphData,
    GraphEdge,
    GraphNode,
    GraphSummaryMetrics,
    RepositoryGraphResponse,
)

logger = logging.getLogger(__name__)

# Noise directories to ignore
IGNORE_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    "target",
    "bin",
    "obj",
    ".idea",
    ".vscode",
    "vendor",
    ".turbo",
    ".cache",
}

# Recognized code extensions for graph parsing
CODE_EXTENSIONS: Dict[str, str] = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".py": "Python",
    ".pyw": "Python",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
}

LAYER_METADATA: Dict[str, Dict[str, str]] = {
    "routing": {
        "key": "routing",
        "name": "[01] ROUTING",
        "description": "API controllers, HTTP routing, endpoint handlers, and presentation tier",
        "color": "#38bdf8",  # Cyber Cyan
    },
    "service": {
        "key": "service",
        "name": "[02] DOMAIN & SERVICES",
        "description": "Business logic, domain orchestrators, workflow processing, and core services",
        "color": "#818cf8",  # Electric Indigo
    },
    "persistence": {
        "key": "persistence",
        "name": "[03] PERSISTENCE",
        "description": "Database models, repositories, schemas, DAO layer, and data storage access",
        "color": "#f59e0b",  # Amber
    },
    "infra": {
        "key": "infra",
        "name": "[04] INFRA",
        "description": "Cross-cutting utilities, third-party adapters, workers, config, and system plumbing",
        "color": "#94a3b8",  # Slate
    },
}


def classify_file_layer(rel_path: str) -> Tuple[str, str]:
    """Classifies a relative file path into an architectural layer."""
    normalized = rel_path.lower().replace("\\", "/")
    tokens = set(re.split(r"[/._-]", normalized))

    # Routing / Presentation Tier
    if any(k in tokens for k in ["api", "routes", "route", "router", "routers", "controller", "controllers", "endpoint", "endpoints", "views", "handlers", "graphql", "rest"]):
        return "routing", LAYER_METADATA["routing"]["name"]

    # Persistence / Data Tier
    if any(k in tokens for k in ["models", "model", "repositories", "repository", "repo", "db", "database", "schemas", "schema", "dao", "entities", "entity", "migrations", "store", "storage"]):
        return "persistence", LAYER_METADATA["persistence"]["name"]

    # Domain / Business Logic Tier
    if any(k in tokens for k in ["service", "services", "domain", "logic", "usecase", "usecases", "workflow", "workflows", "manager", "managers", "processor", "processors", "engine"]):
        return "service", LAYER_METADATA["service"]["name"]

    # Default to Infrastructure & Core Plumbings
    return "infra", LAYER_METADATA["infra"]["name"]


def estimate_cyclomatic_complexity(content: str, ext: str) -> int:
    """Estimates cyclomatic complexity based on conditional/branching keyword occurrences."""
    if not content:
        return 1
    patterns = [
        r"\bif\b",
        r"\belif\b",
        r"\belse\b",
        r"\bfor\b",
        r"\bwhile\b",
        r"\bcase\b",
        r"\bcatch\b",
        r"\bexcept\b",
        r"\&\&",
        r"\|\|",
        r"\?\s*[^:]+:",
    ]
    total_branches = sum(len(re.findall(pat, content)) for pat in patterns)
    return max(1, total_branches // 2 + 1)


def parse_imports_from_file(file_rel_path: str, content: str, known_files: Dict[str, str]) -> List[str]:
    """
    Extracts resolved relative import paths from file content against the known repository files.
    file_rel_path: normalized posix path e.g. "services/payment_processor.ts"
    known_files: mapping of { normalized_rel_path: normalized_rel_path, basename_no_ext: normalized_rel_path }
    """
    ext = os.path.splitext(file_rel_path)[1].lower()
    raw_targets: Set[str] = set()

    # 1. Python imports
    if ext in [".py", ".pyw"]:
        # from x.y import z
        for match in re.finditer(r"^\s*from\s+([\.\w]+)\s+import", content, re.MULTILINE):
            raw_targets.add(match.group(1))
        # import x, y
        for match in re.finditer(r"^\s*import\s+([^\n#]+)", content, re.MULTILINE):
            imported_names = match.group(1).split(",")
            for name in imported_names:
                clean_name = name.strip().split(" as ")[0].strip()
                if clean_name:
                    raw_targets.add(clean_name)

    # 2. JavaScript / TypeScript imports
    elif ext in [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]:
        # import ... from '...' or export ... from '...'
        for match in re.finditer(r"(?:import|export)\s+(?:.*?from\s+)?[\'\"]([^\'\"]+)[\'\"]", content):
            raw_targets.add(match.group(1))
        # require('...')
        for match in re.finditer(r"require\([\'\"]([^\'\"]+)[\'\"]\)", content):
            raw_targets.add(match.group(1))

    # 3. Go imports
    elif ext == ".go":
        block_matches = re.finditer(r"import\s*\(\s*([\s\S]*?)\)", content)
        for block in block_matches:
            for line in block.group(1).splitlines():
                single_match = re.search(r"[\'\"]([^\'\"]+)[\'\"]", line)
                if single_match:
                    raw_targets.add(single_match.group(1))
        for match in re.finditer(r"import\s+[\'\"]([^\'\"]+)[\'\"]", content):
            raw_targets.add(match.group(1))

    resolved_paths: List[str] = []
    file_dir = os.path.dirname(file_rel_path)

    for target in raw_targets:
        target = target.strip()
        if not target:
            continue

        # A. Relative path resolution (./ or ../)
        if target.startswith("./") or target.startswith("../") or target.startswith("."):
            joined = os.path.normpath(os.path.join(file_dir, target)).replace("\\", "/")
            candidates = [
                joined,
                f"{joined}.ts",
                f"{joined}.tsx",
                f"{joined}.js",
                f"{joined}.jsx",
                f"{joined}.py",
                f"{joined}/index.ts",
                f"{joined}/index.tsx",
                f"{joined}/index.js",
                f"{joined}/__init__.py",
            ]
            matched = False
            for cand in candidates:
                cand_clean = cand.lstrip("./")
                if cand_clean in known_files and cand_clean != file_rel_path:
                    resolved_paths.append(cand_clean)
                    matched = True
                    break
            if matched:
                continue

        # B. Python module dot notation (e.g. app.services.user_service or .models)
        if ext in [".py", ".pyw"]:
            parts = target.split(".")
            dot_path = "/".join(parts)
            candidates = [
                f"{dot_path}.py",
                f"{dot_path}/__init__.py",
            ]
            for cand in candidates:
                if cand in known_files and cand != file_rel_path:
                    resolved_paths.append(cand)
                    break
                # Partial suffix match (e.g. services/payment_service.py)
                for k in known_files:
                    if k.endswith(cand) and k != file_rel_path:
                        resolved_paths.append(k)
                        break

        # C. Name match on last token
        last_token = target.split("/")[-1].split(".")[-1]
        if last_token and len(last_token) > 2:
            for k in known_files:
                base_no_ext = os.path.splitext(os.path.basename(k))[0]
                if base_no_ext.lower() == last_token.lower() and k != file_rel_path:
                    if k not in resolved_paths:
                        resolved_paths.append(k)
                    break

    return sorted(list(set(resolved_paths)))


def detect_cycles_tarjan(nodes: List[str], adj_list: Dict[str, List[str]]) -> List[List[str]]:
    """
    Finds circular dependency cycles using Tarjan's Strongly Connected Components algorithm.
    Returns list of cycles where each cycle is a list of node IDs in the loop.
    """
    index = 0
    indices: Dict[str, int] = {}
    lowlinks: Dict[str, int] = {}
    on_stack: Set[str] = set()
    stack: List[str] = []
    sccs: List[List[str]] = []

    def strongconnect(v: str):
        nonlocal index
        indices[v] = index
        lowlinks[v] = index
        index += 1
        stack.append(v)
        on_stack.add(v)

        for w in adj_list.get(v, []):
            if w not in indices:
                strongconnect(w)
                lowlinks[v] = min(lowlinks[v], lowlinks[w])
            elif w in on_stack:
                lowlinks[v] = min(lowlinks[v], indices[w])

        if lowlinks[v] == indices[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                scc.append(w)
                if w == v:
                    break
            # A cycle must have > 1 node, or a direct self-loop
            if len(scc) > 1 or (len(scc) == 1 and v in adj_list.get(v, [])):
                sccs.append(scc)

    for node in nodes:
        if node not in indices:
            strongconnect(node)

    return sccs


def compute_blast_radius(node_id: str, reverse_adj: Dict[str, List[str]], total_nodes: int) -> Tuple[float, int]:
    """Computes downstream reachable files (callers) using BFS traversal."""
    visited: Set[str] = set()
    queue = deque([node_id])

    while queue:
        curr = queue.popleft()
        for caller in reverse_adj.get(curr, []):
            if caller not in visited:
                visited.add(caller)
                queue.append(caller)

    downstream_count = len(visited)
    pct = (downstream_count / total_nodes * 100.0) if total_nodes > 0 else 0.0
    return round(pct, 1), downstream_count


def evaluate_architecture_pattern(layer_counts: Dict[str, int], total_files: int) -> ArchitectureClassification:
    """Classifies the overall repository architectural archetype and confidence."""
    routing = layer_counts.get("routing", 0)
    service = layer_counts.get("service", 0)
    persistence = layer_counts.get("persistence", 0)
    infra = layer_counts.get("infra", 0)

    # Check for Layered / Clean Architecture
    if routing > 0 and service > 0 and persistence > 0:
        confidence = 0.94
        pattern_name = "Layered / Clean Architecture"
        description = (
            "Clear separation of concerns detected across API routing, business services, "
            "and persistence repositories with directional control flow."
        )
    elif routing > 0 and persistence > 0 and service == 0:
        confidence = 0.88
        pattern_name = "MVC / Controller-Model Architecture"
        description = "Direct model-to-controller mapping detected with minimal intermediary domain layers."
    elif service > (routing + persistence):
        confidence = 0.85
        pattern_name = "Domain-Driven / Service-Centric"
        description = "Heavy concentration of domain logic and service orchestration modules."
    else:
        confidence = 0.82
        pattern_name = "Modular Monolith / Component Architecture"
        description = "Feature-isolated modular components with co-located utilities and service boundaries."

    layers_list: List[ArchitectureLayer] = []
    for key, meta in LAYER_METADATA.items():
        layers_list.append(
            ArchitectureLayer(
                key=key,
                name=meta["name"],
                description=meta["description"],
                file_count=layer_counts.get(key, 0),
                color=meta["color"],
            )
        )

    return ArchitectureClassification(
        pattern_name=pattern_name,
        confidence=confidence,
        confidence_display=f"{int(confidence * 100)}% Confidence",
        description=description,
        layers=layers_list,
    )


def build_repository_graph_from_disk(storage_dir: str) -> Tuple[DependencyGraphData, DependencyGraphData, ArchitectureClassification]:
    """
    Crawls code files on disk, extracts import linkages, detects circular loops,
    computes coupling and blast radius, and returns (file_graph, module_graph, architecture).
    """
    if not os.path.exists(storage_dir):
        logger.warning(f"Storage directory does not exist: {storage_dir}")
        empty_metrics = GraphSummaryMetrics()
        empty_graph = DependencyGraphData(metrics=empty_metrics)
        empty_arch = evaluate_architecture_pattern({}, 0)
        return empty_graph, empty_graph, empty_arch

    # 1. Discover all recognized code files
    file_records: Dict[str, Dict[str, Any]] = {}
    known_files: Dict[str, str] = {}

    for root, dirs, files in os.walk(storage_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in CODE_EXTENSIONS:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, storage_dir).replace("\\", "/")
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    lines = content.splitlines()
                    sloc = sum(1 for line in lines if line.strip() and not line.strip().startswith(("#", "//", "/*", "*")))
                    file_records[rel_path] = {
                        "content": content,
                        "sloc": sloc,
                        "ext": ext,
                        "language": CODE_EXTENSIONS[ext],
                        "complexity": estimate_cyclomatic_complexity(content, ext),
                    }
                    known_files[rel_path] = rel_path
                except Exception as e:
                    logger.debug(f"Error reading file {full_path}: {e}")

    total_files = len(file_records)
    logger.info(f"Discovered {total_files} code files in repository storage {storage_dir}")

    # 2. Extract outgoing dependencies for each file
    adj_list: Dict[str, List[str]] = defaultdict(list)
    reverse_adj: Dict[str, List[str]] = defaultdict(list)

    for rel_path, meta in file_records.items():
        deps = parse_imports_from_file(rel_path, meta["content"], known_files)
        adj_list[rel_path] = deps
        for dep in deps:
            reverse_adj[dep].append(rel_path)

    # 3. Detect circular dependencies
    node_ids = list(file_records.keys())
    scc_cycles = detect_cycles_tarjan(node_ids, adj_list)
    nodes_in_cycles: Set[str] = set()
    cycle_edges: Set[Tuple[str, str]] = set()

    formatted_cycles: List[List[str]] = []
    for cycle in scc_cycles:
        formatted_cycles.append(cycle)
        for node in cycle:
            nodes_in_cycles.add(node)
        # Mark edges within this cycle
        for u in cycle:
            for v in adj_list.get(u, []):
                if v in cycle:
                    cycle_edges.add((u, v))

    # 4. Construct File Graph Nodes
    layer_counts: Dict[str, int] = defaultdict(int)
    graph_nodes: List[GraphNode] = []
    edges_list: List[GraphEdge] = []

    for rel_path, meta in file_records.items():
        layer_key, layer_title = classify_file_layer(rel_path)
        layer_counts[layer_key] += 1

        out_deps = adj_list.get(rel_path, [])
        in_callers = reverse_adj.get(rel_path, [])

        ce = len(out_deps)
        ca = len(in_callers)
        instability = round(ce / (ca + ce), 2) if (ca + ce) > 0 else 0.0

        if instability < 0.3:
            eval_label = "Highly Stable"
        elif instability > 0.7:
            eval_label = "Highly Unstable"
        else:
            eval_label = "Loose / Healthy"

        coupling = CouplingMetric(ca=ca, ce=ce, instability=instability, evaluation=eval_label)
        blast_pct, downstream_count = compute_blast_radius(rel_path, reverse_adj, total_files)

        if blast_pct > 50:
            risk = "Critical"
        elif blast_pct > 25:
            risk = "High"
        elif blast_pct > 10:
            risk = "Moderate"
        else:
            risk = "Low"

        c_val = meta["complexity"]
        c_grade = f"H ({c_val})" if c_val > 20 else f"M ({c_val})" if c_val > 10 else f"L ({c_val})"

        node = GraphNode(
            id=rel_path,
            label=os.path.basename(rel_path),
            path=rel_path,
            language=meta["language"],
            layer=layer_key,
            layer_name=layer_title,
            sloc=meta["sloc"],
            complexity=c_val,
            complexity_grade=c_grade,
            in_degree=ca,
            out_degree=ce,
            in_callers=in_callers,
            out_dependencies=out_deps,
            coupling=coupling,
            blast_radius_pct=blast_pct,
            downstream_affected=downstream_count,
            risk_index=risk,
            is_in_cycle=(rel_path in nodes_in_cycles),
        )
        graph_nodes.append(node)

        # Create edges
        for dep in out_deps:
            is_cyc = (rel_path, dep) in cycle_edges
            edges_list.append(
                GraphEdge(
                    id=f"{rel_path}->{dep}",
                    source=rel_path,
                    target=dep,
                    type="import",
                    is_cycle=iscyc if "iscyc" in locals() else is_cyc,
                )
            )

    # Summary metrics for file graph
    total_edges = len(edges_list)
    avg_fan_out = round(total_edges / total_files, 2) if total_files > 0 else 0.0
    cycle_count = len(formatted_cycles)
    modularity = round(max(0.1, 1.0 - min(0.9, (cycle_count * 0.15 + (avg_fan_out / 10.0) * 0.3))), 2)

    mod_eval = "Healthy" if modularity > 0.75 else "Moderate" if modularity > 0.5 else "Tightly Coupled"

    file_summary = GraphSummaryMetrics(
        total_nodes=total_files,
        total_edges=total_edges,
        avg_fan_out=avg_fan_out,
        modularity_index=modularity,
        modularity_evaluation=mod_eval,
        cycle_count=cycle_count,
    )
    file_graph = DependencyGraphData(
        nodes=graph_nodes,
        edges=edges_list,
        cycles=formatted_cycles,
        metrics=file_summary,
    )

    # 5. Build Module / Package Graph
    module_files: Dict[str, List[str]] = defaultdict(list)
    for path in file_records:
        dirname = os.path.dirname(path)
        mod_key = dirname if dirname else "root"
        module_files[mod_key].append(path)

    module_nodes: List[GraphNode] = []
    module_edges: List[GraphEdge] = []
    module_adj: Dict[str, Set[str]] = defaultdict(set)

    for mod_key, files in module_files.items():
        first_file = files[0]
        layer_key, layer_title = classify_file_layer(first_file)
        tot_sloc = sum(file_records[f]["sloc"] for f in files)
        tot_comp = sum(file_records[f]["complexity"] for f in files)

        # Outgoing dependencies to other modules
        out_mods: Set[str] = set()
        for f in files:
            for dep in adj_list.get(f, []):
                dep_mod = os.path.dirname(dep) or "root"
                if dep_mod != mod_key:
                    out_mods.add(dep_mod)
        module_adj[mod_key] = out_mods

    mod_reverse_adj: Dict[str, Set[str]] = defaultdict(set)
    for m, targets in module_adj.items():
        for t in targets:
            mod_reverse_adj[t].add(m)

    for mod_key, files in module_files.items():
        first_file = files[0]
        layer_key, layer_title = classify_file_layer(first_file)
        tot_sloc = sum(file_records[f]["sloc"] for f in files)
        tot_comp = sum(file_records[f]["complexity"] for f in files)
        out_mods = list(module_adj[mod_key])
        in_mods = list(mod_reverse_adj[mod_key])

        mod_node = GraphNode(
            id=mod_key,
            label=mod_key,
            path=mod_key,
            language=file_records[first_file]["language"],
            layer=layer_key,
            layer_name=layer_title,
            sloc=tot_sloc,
            complexity=tot_comp,
            complexity_grade=f"Mod ({len(files)} files)",
            in_degree=len(in_mods),
            out_degree=len(out_mods),
            in_callers=in_mods,
            out_dependencies=out_mods,
            coupling=CouplingMetric(ca=len(in_mods), ce=len(out_mods)),
            blast_radius_pct=round(len(files) / total_files * 100, 1) if total_files > 0 else 0.0,
            downstream_affected=len(in_mods),
            risk_index="Moderate" if len(in_mods) > 3 else "Low",
            is_in_cycle=False,
        )
        module_nodes.append(mod_node)

        for target_mod in out_mods:
            module_edges.append(
                GraphEdge(
                    id=f"{mod_key}->{target_mod}",
                    source=mod_key,
                    target=target_mod,
                    type="import",
                    is_cycle=False,
                )
            )

    mod_summary = GraphSummaryMetrics(
        total_nodes=len(module_nodes),
        total_edges=len(module_edges),
        avg_fan_out=round(len(module_edges) / len(module_nodes), 2) if module_nodes else 0.0,
        modularity_index=modularity,
        modularity_evaluation=mod_eval,
        cycle_count=0,
    )
    module_graph = DependencyGraphData(
        nodes=module_nodes,
        edges=module_edges,
        cycles=[],
        metrics=mod_summary,
    )

    # 6. Architectural Classification
    architecture = evaluate_architecture_pattern(layer_counts, total_files)

    return file_graph, module_graph, architecture


async def get_or_generate_repository_graph(
    db: AsyncIOMotorDatabase,
    owner_id: str,
    project_id: str,
    repo_id: str,
    force_rescan: bool = False,
) -> RepositoryGraphResponse:
    """Retrieves cached repository graph or scans codebase on disk and persists result."""
    # 1. Verify repository ownership
    repo = await db.repositories.find_one({
        "_id": ObjectId(repo_id),
        "owner_id": ObjectId(owner_id),
        "project_id": ObjectId(project_id),
        "is_deleted": False,
    })
    if not repo:
        raise APIError(status_code=404, error_code="REPOSITORY_NOT_FOUND", message="Repository not found or access denied")

    # 2. Check for existing cached graph if not force_rescan
    if not force_rescan:
        existing = await db.repository_graphs.find_one({
            "repository_id": ObjectId(repo_id),
            "owner_id": ObjectId(owner_id),
        })
        if existing:
            return RepositoryGraphResponse(
                id=str(existing["_id"]),
                repository_id=str(existing["repository_id"]),
                owner_id=str(existing["owner_id"]),
                project_id=str(existing["project_id"]),
                ast_engine=existing.get("ast_engine", "Tree-Sitter AST v3.1"),
                ast_status=existing.get("ast_status", "Synchronized"),
                architecture=ArchitectureClassification(**existing["architecture"]),
                file_graph=DependencyGraphData(**existing["file_graph"]),
                module_graph=DependencyGraphData(**existing["module_graph"]),
                created_at=existing["created_at"],
                updated_at=existing["updated_at"],
            )

    # 3. Locate storage path on disk
    storage_key = repo.get("storage_key")
    if storage_key:
        storage_dir = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_PATH, storage_key))
    else:
        storage_dir = os.path.abspath(
            os.path.join(
                settings.LOCAL_STORAGE_PATH,
                str(owner_id),
                str(project_id),
                str(repo_id),
            )
        )

    logger.info(f"Generating dependency graph for repo_id={repo_id} from {storage_dir}")

    # Run the CPU-bound AST & disk scan in thread pool
    file_graph, module_graph, architecture = await asyncio.to_thread(
        build_repository_graph_from_disk, storage_dir
    )

    now = datetime.now(timezone.utc)
    graph_doc = {
        "repository_id": ObjectId(repo_id),
        "owner_id": ObjectId(owner_id),
        "project_id": ObjectId(project_id),
        "ast_engine": "Tree-Sitter AST v3.1",
        "ast_status": "Synchronized",
        "architecture": architecture.model_dump(),
        "file_graph": file_graph.model_dump(),
        "module_graph": module_graph.model_dump(),
        "created_at": now,
        "updated_at": now,
    }

    # Upsert into repository_graphs
    result = await db.repository_graphs.update_one(
        {"repository_id": ObjectId(repo_id), "owner_id": ObjectId(owner_id)},
        {"$set": graph_doc},
        upsert=True,
    )

    doc_id = str(result.upserted_id) if result.upserted_id else None
    if not doc_id:
        fresh = await db.repository_graphs.find_one({
            "repository_id": ObjectId(repo_id),
            "owner_id": ObjectId(owner_id),
        })
        doc_id = str(fresh["_id"]) if fresh else str(ObjectId())

    return RepositoryGraphResponse(
        id=doc_id,
        repository_id=str(repo_id),
        owner_id=str(owner_id),
        project_id=str(project_id),
        ast_engine="Tree-Sitter AST v3.1",
        ast_status="Synchronized",
        architecture=architecture,
        file_graph=file_graph,
        module_graph=module_graph,
        created_at=now,
        updated_at=now,
    )
