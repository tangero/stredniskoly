#!/usr/bin/env python3
import json
import os
import re
import time
import random
from typing import Any, Dict
from urllib.error import HTTPError, URLError
from urllib import request


def load_models_config(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    models = {model["id"]: model for model in data["models"]}
    data["model_index"] = models
    return data


def _post_json(
    url: str,
    headers: Dict[str, str],
    payload: Dict[str, Any],
    max_retries: int = 5,
    initial_backoff_seconds: float = 2.0,
    request_timeout_seconds: float = 180.0
) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url=url, method="POST", headers=headers, data=body)
    attempt = 0
    while True:
        try:
            with request.urlopen(req, timeout=request_timeout_seconds) as response:
                raw = response.read().decode("utf-8")
            return json.loads(raw)
        except HTTPError as error:
            error_body = error.read().decode("utf-8", errors="ignore")
            retriable = error.code in (429, 500, 502, 503, 504)
            if retriable and attempt < max_retries:
                sleep_seconds = initial_backoff_seconds * (2 ** attempt) + random.uniform(0.0, 0.8)
                time.sleep(sleep_seconds)
                attempt += 1
                continue
            raise RuntimeError(
                f"HTTP {error.code} {error.reason} při volání {url}. Odpověď: {error_body}"
            ) from error
        except URLError as error:
            if attempt < max_retries:
                sleep_seconds = initial_backoff_seconds * (2 ** attempt) + random.uniform(0.0, 0.8)
                time.sleep(sleep_seconds)
                attempt += 1
                continue
            raise RuntimeError(f"Network error při volání {url}: {error}") from error


def _stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks = []
        for item in content:
            if isinstance(item, str):
                chunks.append(item)
            elif isinstance(item, dict):
                text = item.get("text") or item.get("output_text") or ""
                if text:
                    chunks.append(text)
        return "\n".join(chunks).strip()
    return str(content)


def _extract_from_responses_api(payload: Dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    chunks = []
    for output_item in payload.get("output", []):
        for content_item in output_item.get("content", []):
            text = content_item.get("text")
            if text:
                chunks.append(text)
    return "\n".join(chunks).strip()


def call_model(model_cfg: Dict[str, Any], system_prompt: str, user_prompt: str) -> str:
    api_key = os.getenv(model_cfg["api_key_env"], "").strip()
    if not api_key:
        raise RuntimeError(f"Chybí API klíč v env: {model_cfg['api_key_env']}")
    base = model_cfg["api_base"].rstrip("/")
    endpoint = model_cfg.get("endpoint", "/chat/completions")
    url = f"{base}{endpoint}"
    style = model_cfg.get("api_style", "chat_completions")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    for key, value in model_cfg.get("extra_headers", {}).items():
        headers[key] = value

    if style == "responses":
        payload = {
            "model": model_cfg["model"],
            "input": [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": system_prompt
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": user_prompt
                        }
                    ]
                }
            ],
            "temperature": model_cfg.get("temperature", 0),
            "max_output_tokens": model_cfg.get("max_output_tokens", 1600)
        }
        response = _post_json(
            url,
            headers,
            payload,
            max_retries=model_cfg.get("max_retries", 5),
            initial_backoff_seconds=model_cfg.get("initial_backoff_seconds", 2.0),
            request_timeout_seconds=model_cfg.get("request_timeout_seconds", 180.0)
        )
        return _extract_from_responses_api(response)

    payload = {
        "model": model_cfg["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": model_cfg.get("temperature", 0),
        "max_tokens": model_cfg.get("max_output_tokens", 1600)
    }
    if "response_format" in model_cfg:
        payload["response_format"] = model_cfg["response_format"]
    if "reasoning" in model_cfg:
        payload["reasoning"] = model_cfg["reasoning"]
    if "include_reasoning" in model_cfg:
        payload["include_reasoning"] = model_cfg["include_reasoning"]
    if "reasoning_effort" in model_cfg:
        payload["reasoning_effort"] = model_cfg["reasoning_effort"]
    response = _post_json(
        url,
        headers,
        payload,
        max_retries=model_cfg.get("max_retries", 5),
        initial_backoff_seconds=model_cfg.get("initial_backoff_seconds", 2.0),
        request_timeout_seconds=model_cfg.get("request_timeout_seconds", 180.0)
    )
    content = response["choices"][0]["message"]["content"]
    return _stringify_content(content).strip()


def extract_json_object(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S)
        if fenced:
            text = fenced[0]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        candidate_matches = re.findall(r"(\{.*\})", text, flags=re.S)
        for candidate in candidate_matches:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
    raise ValueError("Nepodařilo se parsovat JSON z odpovědi modelu.")
