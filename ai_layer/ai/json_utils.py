import json
import re


def extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM output that may contain
    markdown code fences, leading prose, or trailing text.
    Raises json.JSONDecodeError if no valid JSON object is found.
    """
    if not text:
        raise json.JSONDecodeError("empty response", "", 0)

    # 1. Strip markdown code fences: ```json ... ``` or ``` ... ```
    stripped = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()

    # 2. Try direct parse first
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # 3. Find first {...} block (handles leading prose like "Sure! Here is the JSON:")
    match = re.search(r"\{[\s\S]*\}", stripped)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # 4. Last resort — try the raw text
    return json.loads(text)
