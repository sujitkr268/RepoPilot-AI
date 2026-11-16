import math
import re
from typing import List, Dict, Any, Tuple, Optional


class CodeChunk:
    def __init__(self, file_path: str, chunk_index: int, content: str, start_line: int, end_line: int):
        self.file_path = file_path
        self.chunk_index = chunk_index
        self.content = content
        self.start_line = start_line
        self.end_line = end_line
        self.embedding: Optional[List[float]] = None


class VectorSearchService:
    """
    Code chunking and semantic vector search service.
    Implements sliding window code splitting by line and structure,
    and cosine semantic similarity for file context retrieval.
    """

    CHUNK_SIZE_LINES = 60
    CHUNK_OVERLAP_LINES = 15

    @classmethod
    def chunk_file_content(cls, file_path: str, content: str) -> List[CodeChunk]:
        if not content:
            return []

        lines = content.splitlines()
        chunks: List[CodeChunk] = []

        if len(lines) <= cls.CHUNK_SIZE_LINES:
            chunks.append(
                CodeChunk(
                    file_path=file_path,
                    chunk_index=0,
                    content=content,
                    start_line=1,
                    end_line=len(lines),
                )
            )
            return chunks

        i = 0
        chunk_idx = 0
        while i < len(lines):
            end = min(i + cls.CHUNK_SIZE_LINES, len(lines))
            chunk_text = "\n".join(lines[i:end])
            chunks.append(
                CodeChunk(
                    file_path=file_path,
                    chunk_index=chunk_idx,
                    content=chunk_text,
                    start_line=i + 1,
                    end_line=end,
                )
            )
            chunk_idx += 1
            if end >= len(lines):
                break
            i += cls.CHUNK_SIZE_LINES - cls.CHUNK_OVERLAP_LINES

        return chunks

    @classmethod
    def compute_text_vector(cls, text: str) -> Dict[str, float]:
        """
        Computes a term frequency vector for lightweight, deterministic cosine
        semantic similarity across codebases without requiring paid external APIs.
        """
        words = re.findall(r"[a-zA-Z0-9_]{2,}", text.lower())
        vec: Dict[str, float] = {}
        for w in words:
            vec[w] = vec.get(w, 0.0) + 1.0

        # Normalize
        norm = math.sqrt(sum(v * v for v in vec.values()))
        if norm > 0:
            for k in vec:
                vec[k] /= norm
        return vec

    @classmethod
    def cosine_similarity(cls, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        intersection = set(vec1.keys()).intersection(set(vec2.keys()))
        return sum(vec1[k] * vec2[k] for k in intersection)

    @classmethod
    def search_chunks(
        cls, query: str, chunks: List[Dict[str, Any]], top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Searches a collection of chunk dictionaries for the most relevant code sections.
        Each chunk dict has 'path', 'content', 'start_line', 'end_line'.
        """
        query_vec = cls.compute_text_vector(query)
        scored: List[Tuple[Dict[str, Any], float]] = []

        for chunk in chunks:
            chunk_vec = cls.compute_text_vector(chunk.get("content", ""))
            # Also boost if filename matches query words
            file_boost = 0.0
            file_path = chunk.get("path", "").lower()
            for q_word in query.lower().split():
                if len(q_word) > 2 and q_word in file_path:
                    file_boost += 0.2

            sim = cls.cosine_similarity(query_vec, chunk_vec) + file_boost
            if sim > 0.05:
                scored.append((chunk, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]
