import importlib.util,pathlib,unittest
p=pathlib.Path(__file__).resolve().parents[1]/'scripts/refresh-trading-instruments.py'
spec=importlib.util.spec_from_file_location('trading_master',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MasterTests(unittest.TestCase):
 def row(self,board='KOSPI',group='ST',symbol='005930'):
  tail={'KOSPI':228,'KOSDAQ':222,'KONEX':184}[board]
  return symbol.ljust(9)+'KR7005930003'+'테스트 주식'.ljust(30)+group+'0'*(tail-2-(0 if board=='KONEX' else 1))+'\n'
 def test_boards_and_alphanumeric_codes(self):
  for board,tail in [('KOSPI',228),('KOSDAQ',222),('KONEX',184)]:
   rows,excluded=m.parse_master(board,self.row(board,symbol='0070X0'),tail)
   self.assertEqual(rows[0]['symbol'],'0070X0');self.assertEqual(rows[0]['name'],'테스트 주식');self.assertEqual(excluded,[])
 def test_nonshare_and_malformed_identity_are_not_silently_stocks(self):
  self.assertEqual(m.parse_master('KOSPI',self.row(group='EF'),228)[1][0]['reason'],'NON_SHARE_PRODUCT_OR_UNCLASSIFIED')
  self.assertEqual(m.parse_master('KOSPI',self.row(symbol='../x'),228)[0],[])
  with self.assertRaises(ValueError):m.parse_master('KOSPI','short\n',228)
 def test_us_type_and_path_rejection(self):
  fields=['US','1','NAS','NASDAQ','AAPL','DNASAAPL','테스트','Test','2','USD']
  rows,excluded=m.parse_master('NAS','\t'.join(fields)+'\n',None);self.assertEqual(rows[0]['symbol'],'AAPL')
  fields[8]='3';self.assertEqual(m.parse_master('NAS','\t'.join(fields),None)[0],[])
  fields[8]='2';fields[4]='../../bad';self.assertEqual(m.parse_master('NAS','\t'.join(fields),None)[0],[])
if __name__=='__main__':unittest.main()
