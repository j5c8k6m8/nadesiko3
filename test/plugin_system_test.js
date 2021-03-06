const assert = require('assert')
const NakoCompiler = require('../src/nako3')
const NakoRuntimeError = require('../src/nako_runtime_error')

describe('plugin_system_test', () => {
  const nako = new NakoCompiler()
  // nako.debug = true;
  const cmp = (code, res) => {
    if (nako.debug)
      console.log('code=' + code)

    assert.equal(nako.runReset(code).log, res)
  }
  const cmd = (code) => {
    if (nako.debug) console.log('code=' + code)
    nako.runReset(code)
  }

  beforeEach(() => {
    cmd('「Asia/Tokyo」でタイムゾーン設定')
  })

  // --- test ---
  it('ナデシコエンジンを表示', () => {
    cmp('ナデシコエンジンを表示', 'nadesi.com/v3')
  })
  it('四則演算', () => {
    cmp('1に2を足して3を掛けて表示', '9')
    cmp('10を2で割って表示', '5')
    cmp('10を2で割った余り;それを表示', '0')
    cmp('10の2倍;それを表示', '20')
  })
  it('JS実行', () => {
    cmp('「3+6」をJS実行して表示', '9')
    cmp('「Math.floor(3.5)」をJS実行して表示', '3')
  })
  it('型変換', () => {
    cmp('「3.14」を文字列変換して表示', '3.14')
    cmp('「0xFF」を整数変換して表示', '255')
  })
  it('変数型確認', () => {
    cmp('30の変数型確認して表示。', 'number')
  })
  it('SIN/COS/TAN', () => {
    cmp('SIN(1)を表示。', Math.sin(1))
    cmp('COS(1)を表示。', Math.cos(1))
    cmp('TAN(1)を表示。', Math.tan(1))
  })
  it('RGB', () => {
    cmp('RGB(255,255,0)を表示。', '#ffff00')
  })
  it('LOGN', () => {
    cmp('LOGN(10,10)を表示。', Math.LOG10E * Math.log(10))
    cmp('LOGN(2,10)を表示。', Math.LOG2E * Math.log(10))
  })
  it('文字挿入', () => {
    cmp('「12345」の2に「**」を文字挿入して表示', '1**2345')
    cmp('「12345」の1に「**」を文字挿入して表示', '**12345')
    cmp('「12345」の6に「**」を文字挿入して表示', '12345**')
    cmp('「12345」の0に「**」を文字挿入して表示', '**12345')
  })
  it('出現回数', () => {
    cmp('「aabbccaabbcc」で「aa」の出現回数。表示', '2')
    cmp('「aa**bb**cc」で「**」の出現回数。表示', '2')
    cmp('「aa.+bb.+cc」で「.+」の出現回数。表示', '2')
  })
  it('シングル文字列', () => {
    cmp('\'abcd\'を表示。', 'abcd')
  })
  it('文字抜き出す', () => {
    cmp('MID(\'abcdef\',1,2)を表示', 'ab')
    cmp('「abcdef」の1から2を文字抜き出しを表示', 'ab')
    cmp('MID(\'abcdefg\',3,2)を表示', 'cd')
    cmp('「abcdefg」の3から2を文字抜き出しを表示', 'cd')
    cmp('MID(\'abcd\',4,2)を表示', 'd')
    cmp('「abcd」の4から2を文字抜き出しを表示', 'd')
  })
  it('RIGHT', () => {
    cmp('RIGHT(\'abcdef\',2)を表示', 'ef')
    cmp('「abcde」の3だけ文字右部分。それを表示', 'cde')
  })
  it('LEFT', () => {
    cmp('LEFT(\'abcd\',2)を表示', 'ab')
    cmp('「abcde」の3だけ文字左部分。それを表示', 'abc')
  })
  it('切り取る', () => {
    cmp('「abc,def,ghi」から「,」まで切り取る。それを表示。', 'abc')
    cmp('「a,b,c」から「*」まで切り取る。それを表示。', 'a,b,c')
  })
  it('文字削除', () => {
    cmp('「abcd」の1から2だけ文字削除。それを表示。', 'cd')
    cmp('「abcd」の2から2だけ文字削除。それを表示。', 'ad')
    cmp('A=「ab」;「abcd」の1から(Aの文字数)だけ文字削除。それを表示。', 'cd')
  })
  it('置換', () => {
    cmp('「a,b,c」の「,」を「-」に置換して表示。', 'a-b-c')
    cmp('「e,f,g」の「,」を「-」へ単置換して表示。', 'e-f,g')
  })
  it('空白除去', () => {
    cmp('「  aaa   」の空白除去して表示。', 'aaa')
  })
  it('正規表現置換', () => {
    cmp('「aa,bb,cc」の「[a-z]+」を「x」で正規表現置換して表示。', 'x,x,x')
    cmp('「aa,bb,cc」の「/[a-z]+/」を「x」で正規表現置換して表示。', 'x,bb,cc')
    cmp('「aa,bb,cc」の「/[a-z]+/g」を「x」で正規表現置換して表示。', 'x,x,x')
  })
  it('正規表現マッチ - /.../を省略', () => {
    // パターンを省略するとグローバルマッチ
    cmp('「aa,bb,cc」を「[a-z]+」で正規表現マッチ。JSONエンコード。表示。', '["aa","bb","cc"]')
    // グループを指定しても、結果は無視
    cmp('「aa,bb,cc」を「([a-z]+)」で正規表現マッチ。JSONエンコード。表示。', '["aa","bb","cc"]')
  })
  it('正規表現マッチ - /.../あり グルーピングなし', () => {
    cmp('「12-34-56」を「/[0-9]+\\-/」で正規表現マッチ。JSONエンコード。表示。', '"12-"')
  })
  it('正規表現マッチ - /.../あり グルーピングあり', () => {
    // グループ(..)を指定した場合
    cmp('「12-34-56」を「/([0-9]+)\\-/」で正規表現マッチ。JSONエンコード。表示。抽出文字列をJSONエンコードして表示。', '"12-"\n["12"]')
  })
  it('正規表現マッチ2', () => {
    cmp('「AA,BB,CC」を「/^[a-z]+/i」で正規表現マッチ。表示。', 'AA')
  })
  it('正規表現区切る', () => {
    cmp('「aa,bb,cc」を「/\\,/g」で正規表現区切る。JSONエンコード。表示。', '["aa","bb","cc"]')
  })
  it('通貨形式', () => {
    cmp('12345を通貨形式。表示。', '12,345')
    cmp('1000を通貨形式。表示。', '1,000')
  })
  it('ゼロ埋め', () => {
    cmp('10を3でゼロ埋め。表示。', '010')
    cmp('123を5でゼロ埋め。表示。', '00123')
    cmp('12345を3でゼロ埋め。表示。', '12345')
  })
  it('配列要素数', () => {
    cmp('A=[0,1,2,3];Aの配列要素数。表示。', '4')
    cmp('A={"a":1,"b":2,"c":3};Aの配列要素数。表示。', '3')
  })
  it('配列一括挿入', () => {
    cmp('A=[1,1,1];Aの1に[0,0]を配列一括挿入。JSONエンコード。表示。', '[1,0,0,1,1]')
  })
  it('配列ソート', () => {
    cmp('A=[\'ccc\',\'bb\',\'aaa\'];Aを配列ソート。Aを「:」で配列結合。表示。', 'aaa:bb:ccc')
  })
  it('配列数値ソート', () => {
    cmp('A=[\'a\',1,3,2];Aを配列数値ソート。Aを「:」で配列結合。表示。', 'a:1:2:3')
    cmp('A=[\'30\',\'222\',\'55\'];Aを配列数値ソート。Aを「:」で配列結合。表示。', '30:55:222')
  })
  it('配列カスタムソート', () => {
    cmp('●HOGE(aをbで)\n(b-a)を戻す\nここまで\n' +
      'A=[1,5,3];Aを「HOGE」で配列カスタムソート。Aを「:」で配列結合。表示。', '5:3:1')
  })
  it('配列逆順', () => {
    cmp('A=[1,2,3];Aを配列逆順。Aを「:」で配列結合。表示。', '3:2:1')
  })
  it('配列切り取', () => {
    cmp('A=[0,1,2,3];Aの2を配列切り取る。C=それ。Aを「:」で配列結合。表示。Cを表示', '0:1:3\n2')
  })
  it('配列複製', () => {
    cmp('A=[1,2,3];B=Aを配列複製。B[0]=100。Bを「:」で配列結合。表示。', '100:2:3')
    cmp('A=[1,2,3];B=Aを配列複製。B[0]=100。Aを「:」で配列結合。表示。', '1:2:3')
  })
  it('配列足す', () => {
    cmp('A=[1,2,3];B=[4,5,6];AにBを配列足してJSONエンコードして表示。', '[1,2,3,4,5,6]')
    cmp('A=[1,2,3];B=[4,5,6];AにBを配列足してCに代入。AをJSONエンコードして表示', '[1,2,3]') // A自体は変更しない
  })
  it('配列最大値', () => {
    cmp('[2,1,3]の配列最大値を表示', '3')
  })
  it('配列最小値', () => {
    cmp('[2,1,3]の配列最小値を表示', '1')
  })
  it('表ソート', () => {
    cmp('A=[[4,4,4],[2,2,2],[5,5,5]];Aの1を表ソート。AをJSONエンコードして表示。', '[[2,2,2],[4,4,4],[5,5,5]]')
    cmp('A=[[1,4,4],[2,2,2],[3,5,5]];Aの1を表ソート。AをJSONエンコードして表示。', '[[2,2,2],[1,4,4],[3,5,5]]')
    cmp('A=[{n:11},{n:9},{n:13}];Aの"n"を表ソート。AをJSONエンコードして表示。', '[{"n":9},{"n":11},{"n":13}]')
  })
  it('表ピックアップ', () => {
    cmp('A=[["赤",1],["青",2],["緑",3]];Aの0から「赤」を表ピックアップしてJSONエンコードして表示。', '[["赤",1]]')
    cmp('A=[{n:"赤猫"},{n:"青犬"},{n:"白兎"},{n:"青魚"}];Aの"n"から「青」を表ピックアップしてJSONエンコードして表示。', '[{"n":"青犬"},{"n":"青魚"}]')
    cmp('A=[["赤猫",1],["青雉",2],["緑猫",3],["赤字",4]];Aの0から「赤」を表ピックアップしてJSONエンコードして表示。', '[["赤猫",1],["赤字",4]]')
  })
  it('表完全一致ピックアップ', () => {
    cmp('A=[["赤猫",1],["青雉",2],["緑猫",3],["赤字",4]];Aの0から「赤」を表完全一致ピックアップしてJSONエンコードして表示。', '[]')
    cmp('A=[["赤猫",1],["青雉",2],["緑猫",3],["赤字",4]];Aの0から「赤猫」を表完全一致ピックアップしてJSONエンコードして表示。', '[["赤猫",1]]')
    cmp('A=[{n:"赤猫"},{n:"青犬"},{n:"白兎"},{n:"青魚"}];Aの"n"から「青」を表完全一致ピックアップしてJSONエンコードして表示。', '[]')
  })
  it('表検索', () => {
    cmp('A=[["赤",1],["青",2],["緑",3]];Aの0で0から「青」を表検索して表示。', '1')
    cmp('A=[["赤",1],["青",2],["緑",3]];Aの0で0から「紫」を表検索して表示。', '-1')
  })
  it('表列数', () => {
    cmp('A=[["赤",1],["青",2],["緑",3,3]];Aの表列数を表示。', '3')
    cmp('A=["a","b"];Aの表列数を表示。', '1')
  })
  it('表行列交換', () => {
    cmp('A=[["赤",1],["青",2],["緑",3]];Aを表行列交換してJSONエンコードして表示。', '[["赤","青","緑"],[1,2,3]]')
    cmp('A=[[1,2,3],[4,5,6]];Aを表行列交換してJSONエンコードして表示。', '[[1,4],[2,5],[3,6]]')
  })
  it('表右回転', () => {
    cmp('A=[[1,2,3],[4,5,6]];Aを表右回転してJSONエンコードして表示。', '[[4,1],[5,2],[6,3]]')
  })
  it('表重複削除', () => {
    cmp('A=[[1,2,3],[1,1,1],[4,5,6]];Aの0を表重複削除してJSONエンコードして表示。', '[[1,2,3],[4,5,6]]')
  })
  it('表列取得', () => {
    cmp('A=[[1,2,3],[4,5,6]];Aの1を表列取得してJSONエンコードして表示。', '[2,5]')
  })
  it('表列挿入', () => {
    cmp('A=[[1,2,3],[4,5,6]];Aの0へ[9,9]を表列挿入してJSONエンコードして表示。', '[[9,1,2,3],[9,4,5,6]]')
    cmp('A=[[1,2,3],[4,5,6]];Aの1へ[9,9]を表列挿入してJSONエンコードして表示。', '[[1,9,2,3],[4,9,5,6]]')
  })
  it('表列削除', () => {
    cmp('A=[[1,2,3],[4,5,6]];Aの1を表列削除してJSONエンコードして表示。', '[[1,3],[4,6]]')
  })
  it('表列合計', () => {
    cmp('A=[[1,2,3],[4,5,6]];Aの1を表列合計して表示。', '7')
  })
  it('表曖昧検索', () => {
    cmp('A=[[1,"佐藤"],[2,"加藤"]];Aの0から1で「佐」を表曖昧検索して表示。', '0')
  })
  it('表正規表現ピックアップ', () => {
    cmp('A=[[1,"佐藤"],[2,"加藤"]];Aの1から「佐」を表正規表現ピックアップしてJSONエンコードして表示。', '[[1,"佐藤"]]')
    cmp('A=[[1,"佐藤"],[2,"加藤"]];Aの1から「.+藤」を表正規表現ピックアップしてJSONエンコードして表示。', '[[1,"佐藤"],[2,"加藤"]]')
  })
  it('日時', () => {
    cmp('「2017/03/06」の曜日。それを表示', '月')
    cmp('「2017/03/06」の曜日番号取得。それを表示', '1')
    cmp('「2017/03/06 00:00:00」をUNIX時間変換して表示', '1488726000')
    cmp('「2017/03/06 00:00:01」をUNIX時間変換して表示', '1488726001')
    cmp('「2017/03/06 00:00:00」をUNIXTIME変換して表示', '1488726000')
    cmp('「2017/03/06 00:00:01」をUNIXTIME変換して表示', '1488726001')
    cmp('1488726000を日時変換して表示', '2017/03/06 00:00:00')
  })
  it('日時差', () => {
    cmp('「2017/03/06」から「2018/03/06」までの年数差。それを表示', '1')
    cmp('「2017/03/06」と「2018/03/06」の年数差。それを表示', '1')
    cmp('「2018/03/06」から「2017/03/06」までの年数差。それを表示', '-1')
    cmp('「2018/03/06」と「2017/03/06」の年数差。それを表示', '-1')
    cmp('「2017/03/06」から「2017/04/06」までの月数差。それを表示', '1')
    cmp('「2017/03/06」と「2017/04/06」の月数差。それを表示', '1')
    cmp('「2017/04/06」から「2017/03/06」までの月数差。それを表示', '-1')
    cmp('「2017/04/06」と「2017/03/06」の月数差。それを表示', '-1')
    cmp('「2017/03/06」から「2017/04/06」までの日数差。それを表示', '31')
    cmp('「2017/03/06」と「2017/04/06」の日数差。それを表示', '31')
    cmp('「2017/04/06」から「2017/03/06」までの日数差。それを表示', '-31')
    cmp('「2017/04/06」と「2017/03/06」の日数差。それを表示', '-31')
    cmp('「2017/03/06 00:00:00」から「2017/03/06 12:00:00」までの時間差。それを表示', '12')
    cmp('「2017/03/06 00:00:00」と「2017/03/06 12:00:00」の時間差。それを表示', '12')
    cmp('「00:00:00」から「12:00:00」までの時間差。それを表示', '12')
    cmp('「00:00:00」と「12:00:00」の時間差。それを表示', '12')
    cmp('「2017/03/06 12:00:00」から「2017/03/06 00:00:00」までの時間差。それを表示', '-12')
    cmp('「2017/03/06 12:00:00」と「2017/03/06 00:00:00」の時間差。それを表示', '-12')
    cmp('「12:00:00」から「00:00:00」までの時間差。それを表示', '-12')
    cmp('「12:00:00」と「00:00:00」の時間差。それを表示', '-12')
    cmp('「2017/03/06 00:00:00」から「2017/03/06 00:59:00」までの分差。それを表示', '59')
    cmp('「2017/03/06 00:00:00」と「2017/03/06 00:59:00」の分差。それを表示', '59')
    cmp('「00:00:00」から「00:59:00」までの分差。それを表示', '59')
    cmp('「00:00:00」と「00:59:00」の分差。それを表示', '59')
    cmp('「2017/03/06 00:59:00」から「2017/03/06 00:00:00」までの分差。それを表示', '-59')
    cmp('「2017/03/06 00:59:00」と「2017/03/06 00:00:00」の分差。それを表示', '-59')
    cmp('「00:59:00」から「00:00:00」までの分差。それを表示', '-59')
    cmp('「00:59:00」と「00:00:00」の分差。それを表示', '-59')
    cmp('「2017/03/06 00:00:00」から「2017/03/06 00:00:59」までの秒差。それを表示', '59')
    cmp('「2017/03/06 00:00:00」と「2017/03/06 00:00:59」の秒差。それを表示', '59')
    cmp('「00:00:00」から「00:00:59」までの秒差。それを表示', '59')
    cmp('「00:00:00」と「00:00:59」の秒差。それを表示', '59')
    cmp('「2017/03/06 00:00:59」から「2017/03/06 00:00:00」までの秒差。それを表示', '-59')
    cmp('「2017/03/06 00:00:59」と「2017/03/06 00:00:00」の秒差。それを表示', '-59')
    cmp('「00:00:59」から「00:00:00」までの秒差。それを表示', '-59')
    cmp('「00:00:59」と「00:00:00」の秒差。それを表示', '-59')
  })
  it('日時加算', () => {
    cmp('「2017/03/06 00:00:01」に「+01:02:03」を時間加算。それを表示', '2017/03/06 01:02:04')
    cmp('「00:00:01」に「+01:02:03」を時間加算。それを表示', '01:02:04')
    cmp('「2017/03/06 00:00:01」に「-01:02:03」を時間加算。それを表示', '2017/03/05 22:57:58')
    cmp('「00:00:01」に「-01:02:03」を時間加算。それを表示', '22:57:58')
    cmp('「2017/03/06 00:00:01」に「+1年」を日時加算。それを表示', '2018/03/06 00:00:01')
    cmp('「2017/03/06」に「+1年」を日時加算。それを表示', '2018/03/06')
    cmp('「2017/03/06 00:00:01」に「+1ヶ月」を日時加算。それを表示', '2017/04/06 00:00:01')
    cmp('「2017/03/06」に「+1ヶ月」を日時加算。それを表示', '2017/04/06')
    cmp('「2017/03/06 00:00:01」に「+1日」を日時加算。それを表示', '2017/03/07 00:00:01')
    cmp('「2017/03/06」に「+1日」を日時加算。それを表示', '2017/03/07')
    cmp('「2017/03/06 00:00:01」に「+1時間」を日時加算。それを表示', '2017/03/06 01:00:01')
    cmp('「00:00:01」に「+1時間」を日時加算。それを表示', '01:00:01')
    cmp('「2017/03/06 00:00:01」に「+2分」を日時加算。それを表示', '2017/03/06 00:02:01')
    cmp('「00:00:01」に「+2分」を日時加算。それを表示', '00:02:01')
    cmp('「2017/03/06 00:00:01」に「+3秒」を日時加算。それを表示', '2017/03/06 00:00:04')
    cmp('「00:00:01」に「+3秒」を日時加算。それを表示', '00:00:04')
    cmp('「2017/03/06 00:00:01」に「-1年」を日時加算。それを表示', '2016/03/06 00:00:01')
    cmp('「2017/03/06」に「-1年」を日時加算。それを表示', '2016/03/06')
    cmp('「2017/03/06 00:00:01」に「-1ヶ月」を日時加算。それを表示', '2017/02/06 00:00:01')
    cmp('「2017/03/06」に「-1ヶ月」を日時加算。それを表示', '2017/02/06')
    cmp('「2017/03/06 00:00:01」に「-1日」を日時加算。それを表示', '2017/03/05 00:00:01')
    cmp('「2017/03/06」に「-1日」を日時加算。それを表示', '2017/03/05')
    cmp('「2017/03/06 00:00:01」に「-1時間」を日時加算。それを表示', '2017/03/05 23:00:01')
    cmp('「00:00:01」に「-1時間」を日時加算。それを表示', '23:00:01')
    cmp('「2017/03/06 00:00:01」に「-2分」を日時加算。それを表示', '2017/03/05 23:58:01')
    cmp('「00:00:01」に「-2分」を日時加算。それを表示', '23:58:01')
    cmp('「2017/03/06 00:00:01」に「-3秒」を日時加算。それを表示', '2017/03/05 23:59:58')
    cmp('「00:00:01」に「-3秒」を日時加算。それを表示', '23:59:58')
    cmp('「2017/03/06 00:00:01」に「+0001/02/03」を日付加算。それを表示', '2018/05/09 00:00:01')
    cmp('「2017/03/06」に「+0001/02/03」を日付加算。それを表示', '2018/05/09')
    cmp('「2017/03/06 00:00:01」に「-0001/02/03」を日付加算。それを表示', '2016/01/03 00:00:01')
    cmp('「2017/03/06」に「-0001/02/03」を日付加算。それを表示', '2016/01/03')
  })
  it('文字種変換', () => {
    cmp('「abc」を大文字変換して表示', 'ABC')
    cmp('「ABC」を小文字変換して表示', 'abc')
    cmp('「アイウ」を平仮名変換して表示', 'あいう')
    cmp('「あいう」をカタカナ変換して表示', 'アイウ')
  })
  it('空配列', () => {
    cmp('A=空配列;A@0=10;A@1=20;A@2=30;A@1を表示。', '20')
  })
  it('空ハッシュ', () => {
    cmp('A=空ハッシュ;A[「あ」]=10;A[「い」]=20;A[「う」]=30;A[「い」]を表示。', '20')
  })
  it('空オブジェクト', () => {
    cmp('A=空オブジェクト;A[「あ」]=10;A[「い」]=20;A[「う」]=30;A[「い」]を表示。', '20')
  })
  it('四捨五入', () => {
    cmp('3.14を四捨五入して表示。', '3')
    cmp('3.6を四捨五入して表示。', '4')
    cmp('3.5を四捨五入して表示。', '4')
    cmp('3.15を1で小数点四捨五入して表示。', '3.2')
    cmp('3.14を1で小数点四捨五入して表示。', '3.1')
  })
  it('切り上げ・切り捨て', () => {
    cmp('3.14を切り上げして表示。', '4')
    cmp('3.8を切り上げして表示。', '4')
    cmp('3.1を切り捨てして表示。', '3')
    cmp('3.8を切り捨てして表示。', '3')
    cmp('0.31を1で小数点切り上げして表示。', '0.4')
    cmp('0.38を1で小数点切り下げして表示。', '0.3')
  })
  it('カタカナか判定', () => {
    cmp('「アイウエオ」がカタカナか判定して表示。', 'true')
    cmp('「あいうえお」がカタカナか判定して表示。', 'false')
  })
  it('数字か判定', () => {
    cmp('「12345」が数字か判定して表示。', 'true')
    cmp('「あいうえお」が数字か判定して表示。', 'false')
  })
  it('数列か判定', () => {
    cmp('「12345」が数列か判定して表示。', 'true')
    cmp('「あいうえお」が数列か判定して表示。', 'false')
  })
  it('XOR', () => {
    cmp('XOR(0xFF, 0xF)を表示。', '240')
  })
  it('CHR-サロゲートペアを考慮', () => {
    cmp('CHR(12354)を表示。', 'あ')
    cmp('CHR(0x5200)を表示。', '刀')
    cmp('CHR(0x29E3D)を表示。', '𩸽')
    cmp('CHR(0x2A6CF)を表示。', '𪛏')
  })
  it('ASC-サロゲートペアを考慮', () => {
    cmp('ASC("あ")を表示。', '12354')
    cmp('HEX(ASC("𩸽"))を表示。', '29e3d')
  })
  it('文字数-サロゲートペアを考慮', () => {
    cmp('文字数("𩸽のひらき")を表示。', '5')
  })
  it('文字列分解-サロゲートペアを考慮', () => {
    cmp('JSONエンコード(文字列分解("𩸽のひらき"))を表示。', '["𩸽","の","ひ","ら","き"]')
  })
  it('プラグイン一覧取得', () => {
    cmp('プラグイン一覧取得して「:」で配列結合して表示', 'PluginSystem:PluginAssert')
  })
  it('配列切り取り', () => {
    cmp('A=[0,1,2,3,4,5];Aの0を配列切り取り;表示', '0')
    cmp('A=[0,1,2,3,4,5];Aの1を配列切り取り;Aを「:」で配列結合して表示', '0:2:3:4:5')
  })
  it('ハッシュ', () => {
    cmp('A={"a":0,"b":1,"c":2};Aのハッシュキー列挙して配列ソートして「:」で配列結合して表示', 'a:b:c')
    cmp('A={"a":0,"b":1,"c":2};Aの要素数を表示', '3')
    cmp('A={"a":0,"b":1,"c":2};Aから「b」をハッシュキー削除して要素数を表示', '2')
    cmp('A={"a":0,"b":1,"c":2};Aのハッシュ内容列挙して配列ソートして「:」で配列結合して表示', '0:1:2')
    cmp('A={"a":0,"b":1,"c":2};Aに"c"がハッシュキー存在。もし、そうならば「OK」と表示。違えば、「NG」と表示。', 'OK')
    cmp('A={"a":0,"b":1,"c":2};Aに"d"がハッシュキー存在。もし、そうならば「NG」と表示。違えば、「OK」と表示。', 'OK')
  })
  it('ビット演算', () => {
    cmp('OR(0xF0,0xF)を表示', '255')
    cmp('AND(0xF7,0xF)を表示', '7')
    cmp('XOR(1,1)を表示', '0')
    cmp('XOR(0,1)を表示', '1')
    cmp('NOT(0xFF)を表示', '-256')
  })
  it('論理演算', () => {
    cmp('論理OR(1,0)を表示', '1')
    cmp('論理AND(1,0)を表示', '0')
    cmp('論理NOT(1)を表示', '0')
  })
  it('英数記号全角半角変換', () => {
    cmp('「＃！」を英数記号半角変換して表示', '#!')
    cmp('「#!」を英数記号全角変換して表示', '＃！')
    cmp('「abc123#」を英数記号全角変換して表示', 'ａｂｃ１２３＃')
    cmp('「ａｂｃ１２３＃」を英数記号半角変換して表示', 'abc123#')
    cmp('「abc123」を英数全角変換して表示', 'ａｂｃ１２３')
    cmp('「ａｂｃ１２３」を英数半角変換して表示', 'abc123')
  })
  it('カタカナ全角半角変換', () => {
    cmp('「アガペ123」をカタカナ半角変換して表示', 'ｱｶﾞﾍﾟ123')
    cmp('「ｱｶﾞﾍﾟ123」をカタカナ全角変換して表示', 'アガペ123')
    cmp('「アガペ#!１２３」を半角変換して表示', 'ｱｶﾞﾍﾟ#!123')
    cmp('「ｱｶﾞﾍﾟ#!123」を全角変換して表示', 'アガペ＃！１２３')
  })
  it('CSV取得', () => {
    cmp('a=「1,2,3\n4,5,6」のCSV取得。a[1][2]を表示', '6')
    cmp('a=「"a",b,c\n""a,b,c\na,""b,c\na,b,c""\n"a,\nb",c,d\na,"b,\nc",d\na,b,"c,\nd"」のCSV取得。a[5][1]を表示', 'b,\nc')
    cmp('a=「1,"a""a",2」のCSV取得。a[0][1]を表示', 'a"a')
    cmp('a=「1,"2""2",3\n4,5,6」のCSV取得。a[0][1]を表示', '2"2')
    cmp('a=「1,,3\n4,5,6」のCSV取得。a[0][2]を表示', '3')
    cmp('a=「1,2,3,\n4,5,6」のCSV取得。a[1][0]を表示', '4') // #353
  })
  it('TSV取得', () => {
    cmp('a=「1\t2\t3\n4\t5\t6」のTSV取得。a[1][2]を表示', '6')
    cmp('a=「"a"\tb\tc\n""a\tb\tc\na\t""b\tc\na\tb\tc""\n"a\t\nb"\tc\td\na\t"b\t\nc"\td\na\tb\t"c\t\nd"」のTSV取得。a[5][1]を表示', 'b\t\nc')
    cmp('a=「1\t"a""a"\t2」のTSV取得。a[0][1]を表示', 'a"a')
    cmp('a=「1\t"2""2"\t3\n4\t5\t6」のTSV取得。a[0][1]を表示', '2"2')
    cmp('a=「1\t\t3\n4\t5\t6」のTSV取得。a[0][2]を表示', '3')
  })
  it('表CSV変換', () => {
    cmp('[[1,2,3],[4,5,6]]を表CSV変換して表示', '1,2,3\r\n4,5,6')
    cmp('[[1,2,"3\r\n,"],[4,5,6]]を表CSV変換して表示', '1,2,"3\r\n,"\r\n4,5,6')
  })
  it('表TSV変換', () => {
    cmp('[[1,2,3],[4,5,6]]を表TSV変換して表示', '1\t2\t3\r\n4\t5\t6')
    cmp('[[1,2,"3\r\n\t"],[4,5,6]]を表TSV変換して表示', '1\t2\t"3\r\n\t"\r\n4\t5\t6')
  })
  it('JS関数実行', () => {
    cmp('"Math.floor"を[3.14]でJS関数実行して表示', '3')
    cmp('"Math.floor"を3.14でJS関数実行して表示', '3')
    cmp('F="Math.floor"でJS実行;Fを[3.14]でJS関数実行して表示', '3')
  })
  it('文字列検索', () => {
    cmp('「しんぶんし」で1から「ん」を文字検索して表示', '2')
    cmp('「しんぶんし」で3から「ん」を文字検索して表示', '4')
    cmp('「しんぶんし」で5から「ん」を文字検索して表示', '0')
  })
  it('TYPEOF', () => {
    cmp('TYPEOF(「あ」)を表示', 'string')
    cmp('TYPEOF(0)を表示', 'number')
    cmp('もし、NAN判定(INT(「あ」))ならば、「ok」と表示。違えば、「ng」と表示', 'ok')
  })
  it('元号データ, 和暦変換', () => {
    assert.throws(
      () => cmd('「1868/10/22」を和暦変換。それを表示'),
      err => {
        assert(err instanceof NakoRuntimeError)

        // エラーメッセージの内容が正しいか
        assert(err.message.indexOf(`『和暦変換』は明治以前の日付には対応していません。`) > -1)
        return true
      }
    )
    cmp('「1868/10/23」を和暦変換。それを表示', '明治元/10/23')
    cmp('「1912/07/29」を和暦変換。それを表示', '明治45/07/29')
    cmp('「1912/07/30」を和暦変換。それを表示', '大正元/07/30')
    cmp('「1926/12/24」を和暦変換。それを表示', '大正15/12/24')
    cmp('「1926/12/25」を和暦変換。それを表示', '昭和元/12/25')
    cmp('「1989/01/07」を和暦変換。それを表示', '昭和64/01/07')
    cmp('「1989/01/08」を和暦変換。それを表示', '平成元/01/08')
    cmp('「2019/04/30」を和暦変換。それを表示', '平成31/04/30')
    cmp('「2019/05/01」を和暦変換。それを表示', '令和元/05/01')
  })
})
