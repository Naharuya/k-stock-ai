import unittest,datetime,copy
from verify_https_preview import verify
class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.now=datetime.datetime(2026,10,20,tzinfo=datetime.timezone.utc)
        self.receipt={'kind':'IOS_HTTPS_PREVIEW_READ_ONLY','checkedAt':'2026-10-19T23:59:00Z','persistentWebsiteStorage':False,'result':{'origin':'https://kstock.ai.kr','secureContext':True,'anonymousApiStatus':401,'appShellReady':True}}
    def test_expected_receipt(self):self.assertTrue(verify(self.receipt,self.now))
    def test_reject_false_success(self):
        for field,value in [('origin','http://kstock.ai.kr'),('origin','https://other.invalid'),('secureContext',False),('anonymousApiStatus',200),('anonymousApiStatus',403),('appShellReady',False)]:
            r=copy.deepcopy(self.receipt);r['result'][field]=value;self.assertFalse(verify(r,self.now))
    def test_reject_stale_future_persistent_and_error(self):
        for field,value in [('checkedAt','2026-10-18T00:00:00Z'),('checkedAt','2026-10-21T00:00:00Z'),('checkedAt','invalid'),('persistentWebsiteStorage',True),('error','request failed'),('serverPageStatus','BLOCKED_WEB_ASSETS_NOT_DEPLOYED')]:
            r=copy.deepcopy(self.receipt);r[field]=value;self.assertFalse(verify(r,self.now))
    def test_reject_malformed(self):
        for value in [None,[],{}, {'result':None}, {'result':[]}]:self.assertFalse(verify(value,self.now))
if __name__=='__main__':unittest.main()
