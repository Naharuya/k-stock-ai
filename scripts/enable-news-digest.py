"""Remote operator helper: enable only the approved half-hour public news reader."""
import os, pathlib, json
assert os.geteuid()==0, 'ROOT_REQUIRED_FOR_EXISTING_SERVICE_DROPIN'
target=pathlib.Path('/etc/systemd/system/k-stock-ai.service.d/96-news-digest.conf')
content='[Service]\nEnvironment=KSTOCK_NEWS_DIGEST_ENABLED=true\n'
assert not target.is_symlink()
if target.exists():
    assert target.read_text()==content, 'EXISTING_CONFIGURATION_DIFFERS_PRESERVED'
else:
    assert target.parent.is_dir()
    fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as out:out.write(content)
print(json.dumps({'newsEnabledConfiguration':True,'mainEnvironmentChanged':False,'requiresReviewedActivation':True}))
