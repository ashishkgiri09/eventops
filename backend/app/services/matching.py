from typing import Any


def expertise_scores(judges: list[Any], targets: list[Any]) -> dict[tuple[str, str], int]:
    """Return 0-100 TF-IDF cosine similarity for judge expertise vs. target domain."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    judge_text = [" ".join(str(term) for term in (judge.expertise or [])) for judge in judges]
    target_text = [str(target.domain or "") for target in targets]
    documents = judge_text + target_text
    if not documents or not any(document.strip() for document in documents):
        return {}
    try:
        matrix = TfidfVectorizer(ngram_range=(1, 2), stop_words="english").fit_transform(documents)
    except ValueError:
        return {}
    scores = cosine_similarity(matrix[: len(judges)], matrix[len(judges) :])
    return {(judge.id, target.id): round(float(scores[judge_index, target_index]) * 100)
            for judge_index, judge in enumerate(judges)
            for target_index, target in enumerate(targets)}
