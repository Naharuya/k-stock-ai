"""Fail-closed verifier for read-only HTTPS preview receipts; never handles tokens."""
import datetime

def verify(receipt, now=None):
    if not isinstance(receipt,dict) or not isinstance(receipt.get("result"),dict):return False
    now=now or datetime.datetime.now(datetime.timezone.utc)
    try:
        checked=datetime.datetime.fromisoformat(receipt.get('checkedAt','').replace('Z','+00:00'))
        age=(now-checked).total_seconds()
    except (ValueError,TypeError):return False
    result=receipt.get('result',{})
    return (receipt.get('kind')=='IOS_HTTPS_PREVIEW_READ_ONLY'
            and 0<=age<=600 and receipt.get('persistentWebsiteStorage') is False
            and 'error' not in receipt and receipt.get('serverPageStatus') is None and result.get('origin')=='https://kstock.ai.kr'
            and result.get('secureContext') is True and result.get('anonymousApiStatus')==401
            and result.get('appShellReady') is True)
