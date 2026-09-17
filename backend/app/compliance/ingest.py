import os
import glob
import logging
import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
POLICIES_DIR = os.path.join(CURRENT_DIR, "policies")
CHROMA_DB_PATH = os.path.join(CURRENT_DIR, "chroma_db")
COLLECTION_NAME = "procurement_policies"

_embedding_fn = None


def get_embedding_function():
    global _embedding_fn
    if _embedding_fn is None:
        try:
            _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
        except Exception as e:
            logger.warning(f"SentenceTransformer embedding function init warning: {e}. Falling back to default.")
            _embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _embedding_fn


def get_chroma_client():
    os.makedirs(CHROMA_DB_PATH, exist_ok=True)
    return chromadb.PersistentClient(path=CHROMA_DB_PATH)


def init_policy_db():
    """
    Chunks policy documents and embeds them into the local ChromaDB collection if empty.
    """
    client = get_chroma_client()
    emb_fn = get_embedding_function()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=emb_fn
    )

    count = collection.count()
    if count > 0:
        logger.info(f"ChromaDB collection '{COLLECTION_NAME}' already contains {count} policy chunks.")
        return collection

    logger.info(f"Ingesting policy documents from {POLICIES_DIR} into ChromaDB...")
    md_files = glob.glob(os.path.join(POLICIES_DIR, "*.md"))
    if not md_files:
        logger.warning(f"No policy markdown files found in {POLICIES_DIR}")
        return collection

    documents = []
    metadatas = []
    ids = []

    for file_path in md_files:
        filename = os.path.basename(file_path)
        rule_key = os.path.splitext(filename)[0]

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()

        # Split content into title and body
        lines = content.splitlines()
        title = lines[0].replace("#", "").strip() if lines else rule_key
        body = "\n".join(lines[1:]).strip() if len(lines) > 1 else content

        # Add full rule document
        doc_id = f"policy_{rule_key}"
        documents.append(f"Policy Rule: {title}\n{body}")
        metadatas.append({
            "source_file": filename,
            "rule_name": title,
            "rule_key": rule_key
        })
        ids.append(doc_id)

    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Successfully indexed {len(documents)} policy documents into ChromaDB.")

    return collection


def get_policy_collection():
    client = get_chroma_client()
    emb_fn = get_embedding_function()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=emb_fn
    )


if __name__ == "__main__":
    col = init_policy_db()
    print(f"Policy DB initialized. Total chunks: {col.count()}")
