/**
 * nadesiko v3 parser (demo version)
 */
const {opPriority, keizokuJosi} = require('./nako_parser_const')
const {NakoParserBase, NakoSyntaxError} = require('./nako_parser_base')
const operatorList = []
for (const key in opPriority) {operatorList.push(key)}

class NakoParser extends NakoParserBase {
  /**
   * @param tokens 字句解析済みのトークンの配列
   * @return {{type, block, line}} AST(構文木)
   */
  parse (tokens) {
    this.reset()
    this.tokens = tokens
    // 解析開始
    return this.startParser()
  }

  startParser () {
    const b = this.ySentenceList()
    const c = this.get()
    if (c && c.type !== 'eof') {
      const name = this.nodeToStr(c)
      throw new NakoSyntaxError(
        `構文解析でエラー。${name}の使い方が間違っています。`, c.line, this.filename)
    }
    return b
  }

  ySentenceList () {
    const blocks = []
    let line = -1
    while (!this.isEOF()) {
      const n = this.ySentence()
      if (!n) {break}
      blocks.push(n)
      if (line < 0) {line = n.line}
    }
    if (blocks.length === 0) {
      throw new NakoSyntaxError('構文解析に失敗:' + this.nodeToStr(this.peek()),
        line, this.filename)
    }

    return {type: 'block', block: blocks, line}
  }

  ySentence () {
    // 最初の語句が決まっている構文
    if (this.check('eol')) {return this.get()}
    if (this.check('embed_code')) {return this.get()}
    if (this.check('もし')) {return this.yIF()}
    if (this.check('エラー監視')) {return this.yTryExcept()}
    if (this.check('逐次実行')) {return this.yPromise()}
    if (this.accept(['抜ける'])) {return {type: 'break', line: this.y[0].line, josi: ''}}
    if (this.accept(['続ける'])) {return {type: 'continue', line: this.y[0].line, josi: ''}}
    if (this.accept(['require', 'string', '取込']))
      {return {
        type: 'require',
        value: this.y[1].value,
        line: this.y[0].line,
        josi: ''
      }}

    // 先読みして初めて確定する構文
    if (this.accept([this.yLet])) {return this.y[0]}
    if (this.accept([this.yDefTest])) {return this.y[0]}
    if (this.accept([this.yDefFunc])) {return this.y[0]}
    if (this.accept([this.yCall])) { // 関数呼び出しの他、各種構文の実装
      const c1 = this.y[0]
      if (c1.josi === 'して') { // 連文をblockとして接続する(もし構文、逐次実行構文などのため)
        const c2 = this.ySentence()
        if (c2 !== null) {
          return {
            type: 'block',
            block: [c1, c2],
            josi: c2.josi
          }
        }
      }
      return c1
    }
    return null
  }

  yBlock () {
    const blocks = []
    let line = -1
    if (this.check('ここから')) {this.get()}
    while (!this.isEOF()) {
      if (this.checkTypes(['違えば', 'ここまで', 'エラー'])) {break}
      if (!this.accept([this.ySentence])) {break}
      blocks.push(this.y[0])
      if (line < 0) {line = this.y[0].line}
    }
    return {type: 'block', block: blocks, line}
  }

  yDefFuncReadArgs () {
    if (!this.check('(')) {return null}
    const a = []
    this.get() // skip '('
    while (!this.isEOF()) {
      if (this.check(')')) {
        this.get() // skip ''
        break
      }
      a.push(this.get())
      if (this.check('comma')) {this.get()}
    }
    return a
  }

  yDefTest() {
    return this.yDef('def_test')
  }

  yDefFunc() {
    return this.yDef('def_func')
  }

  yDef(type) {
    if (!this.check(type)) {
      return null
    }
    const def = this.get() // ●
    let defArgs = []
    if (this.check('('))
      {defArgs = this.yDefFuncReadArgs()} // // lexerでも解析しているが再度詳しく

    const funcName = this.get()
    if (funcName.type !== 'func')
      {throw new NakoSyntaxError(
        '関数' + this.nodeToStr(funcName) +
        'の宣言でエラー。', funcName.line, this.filename)}

    if (this.check('(')) {
      // 関数引数の二重定義
      if (defArgs.length > 0)
        {throw new NakoSyntaxError(
          '関数' + this.nodeToStr(funcName) +
          'の宣言で、引数定義は名前の前か後に一度だけ可能です。', funcName.line, this.filename)}
      defArgs = this.yDefFuncReadArgs()
    }

    if (this.check('とは')) {this.get()}
    let block = null
    let multiline = false
    if (this.check('ここから')) {multiline = true}
    if (this.check('eol')) {multiline = true}
    try {
      if (multiline) {
        this.saveStack()
        block = this.yBlock()
        if (this.check('ここまで'))
          {this.get()}
        else
          {throw new NakoSyntaxError('『ここまで』がありません。関数定義の末尾に必要です。', def.line, this.filename)}
        this.loadStack()
      } else {
        this.saveStack()
        block = this.ySentence()
        this.loadStack()
      }
    } catch (err) {
      throw new NakoSyntaxError('関数' + this.nodeToStr(funcName) +
        'の定義で以下のエラーがありました。\n' + err.message, def.line, this.filename)
    }

    return {
      type,
      name: funcName,
      args: defArgs,
      block,
      line: def.line,
      josi: ''
    }
  }

  yIFCond () { // もしの条件の取得
    let a = this.yGetArg()
    if (!a) {return null}
    // console.log('yIFCond=', a, this.peek())
    // チェック : AがBならば
    if (a.josi === 'が') {
      const tmpI = this.index
      const b = this.yGetArg()
      const naraba = this.get()
      if (b && naraba && naraba.type === 'ならば')
        {return {
          type: 'op',
          operator: (naraba.value === 'でなければ') ? 'noteq' : 'eq',
          left: a,
          right: b,
          line: a.line,
          josi: ''
        }}

      this.index = tmpI
    }
    if (a.josi !== '') {
      // もし文で関数呼び出しがある場合
      this.stack.push(a)
      a = this.yCall()
    }
    // (ならば|でなければ)を確認
    if (!this.check('ならば')) {
      throw new NakoSyntaxError(
        'もし文で『ならば』がないか、条件が複雑過ぎます。『' +
        this.nodeToStr(this.peek()) +
        '』の直前に『ならば』を書いてください。', a.line, this.filename)
      }

    const naraba = this.get()
    if (naraba.value === 'でなければ')
      {a = {
        type: 'not',
        value: a,
        line: a.line,
        josi: ''
      }}

    return a
  }

  yIF () {
    if (!this.check('もし')) {return null}
    const mosi = this.get() // skip もし
    let cond = null
    try {
      cond = this.yIFCond()
    } catch (err) {
      throw new NakoSyntaxError(
        '『もし』文の条件で次のエラーがあります。\n' + err.message,
        mosi.line, this.filename)
    }
    if (cond === null) {
      throw new NakoSyntaxError('『もし』文で条件の指定が空です。',
      mosi.line,
      this.filename)
    }
    let trueBlock = null
    let falseBlock = null
    let tanbun = false

    // True Block
    if (this.check('eol')) {
      trueBlock = this.yBlock()
    } else {
      trueBlock = this.ySentence()
      tanbun = true
    }

    // skip EOL
    while (this.check('eol')) {this.get()}

    // Flase Block
    if (this.check('違えば')) {
      this.get() // skip 違えば
      if (this.check('eol')){
        falseBlock = this.yBlock()
      } else {
        falseBlock = this.ySentence()
        tanbun = true
      }
    }

    if (tanbun === false) {
      if (this.check('ここまで')) {
        this.get()
      } else {
        throw new NakoSyntaxError('『もし』文で『ここまで』がありません。',
          mosi.line, this.filename)
      }
    }
    return {
      type: 'if',
      expr: cond,
      block: trueBlock,
      false_block: falseBlock,
      josi: '',
      line: mosi.line
    }
  }

  yPromise () {
    if (!this.check('逐次実行')) {return null}
    const tikuji = this.get() // skip 逐次実行
    const blocks = []
    if (!this.check('eol')) {
      throw new NakoSyntaxError(
        '『逐次実行』の直後は改行が必要です',
        tikuji.line, this.filename)
    }
    while (this.check('eol'))
      {this.get()} // skip EOL
    // ブロックを読む
    for (;;) {
      if (!this.check('先に') && !this.check('次に')) {break}
      const tugini = this.get() // skip 次に
      let block = null
      if (this.check('eol')) { // block
        block = this.yBlock()
        if (!this.check('ここまで')) {
          throw new NakoSyntaxError(
            `『${tugini.type}』...『ここまで』を対応させてください。`,
            tugini.line, this.filename)
        }
        this.get() // skip 'ここまで'
      } else { // line
        block = this.ySentence()
      }
      blocks.push(block)
      while (this.check('eol'))
        {this.get()} // skip EOL
    }
    if (!this.check('ここまで')) {
      console.log(blocks, this.peek())
      throw new NakoSyntaxError(
        '『逐次実行』...『ここまで』を対応させてください。', tikuji.line, this.filename)
    }
    this.get() // skip 'ここまで'
    return {
      type: 'promise',
      blocks: blocks,
      josi: '',
      line: tikuji.line
    }
  }

  yGetArg () {
    // 値を一つ読む
    let value1 = this.yValue()
    if (value1 === null) {return null}
    // 計算式がある場合を考慮
    const args = [value1]
    while (!this.isEOF()) {
      // 演算子がある？
      const op = this.peek()
      if (op && opPriority[op.type]) {
        args.push(this.get())
        // 演算子後の値を取得
        const v = this.yValue()
        if (v === null) {
          throw new NakoSyntaxError(
            `計算式で演算子『${op.value}』後に値がありません`,
            value1.line, this.filename)
        }
        args.push(v)
        continue
      }
      break
    }
    if (args.length === 0) {return null}
    if (args.length === 1) {return args[0]}
    return this.infixToAST(args)
  }

  infixToPolish (list) {
    // 中間記法から逆ポーランドに変換
    const priority = (t) => {
      if (opPriority[t.type]) {return opPriority[t.type]}
      return 10
    }
    const stack = []
    const polish = []
    while (list.length > 0) {
      const t = list.shift()
      while (stack.length > 0) { // 優先順位を見て移動する
        const sTop = stack[stack.length - 1]
        if (priority(t) > priority(sTop)) {break}
        polish.push(stack.pop())
      }
      stack.push(t)
    }
    // 残った要素を積み替える
    while (stack.length > 0) {polish.push(stack.pop())}
    return polish
  }

  infixToAST (list) {
    if (list.length === 0) {return null}
    // 逆ポーランドを構文木に
    const josi = list[list.length - 1].josi
    const line = list[list.length - 1].line
    const polish = this.infixToPolish(list)
    const stack = []
    for (const t of polish) {
      if (!opPriority[t.type]) { // 演算子ではない
        stack.push(t)
        continue
      }
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) {
        if (this.debug) {
          console.log('--- 計算式(逆ポーランド) ---')
          console.log(polish)
        }
        throw new NakoSyntaxError('計算式でエラー', line, this.filename)
      }
      const op = {
        type: 'op',
        operator: t.type,
        left: a,
        right: b,
        line: a.line,
        josi: josi
      }
      stack.push(op)
    }
    return stack.pop()
  }

  yGetArgParen (func) { // C言語風呼び出しでカッコの中を取得
    let isClose = false
    const si = this.stack.length
    while (!this.isEOF()) {
      if (this.check(')')) {
        isClose = true
        break
      }
      const v = this.yGetArg()
      if (v) {
        this.pushStack(v)
        if (this.check('comma')) {this.get()}
        continue
      }
      break
    }
    if (!isClose) {
      throw new NakoSyntaxError(`C風関数『${func.value}』でカッコが閉じていません`,
        func.line, this.filename)
    }
    const a = []
    while (si < this.stack.length) {
      const v = this.popStack()
      a.unshift(v)
    }
    return a
  }

  yRepeatTime () {
    if (!this.check('回')) {return null}
    const kai = this.get()
    let num = this.popStack([])
    let multiline = false
    let block = null
    if (num === null) {num = {type: 'word', value: 'それ', josi: '', line: kai.line}}
    if (this.check('ここから')) {
      this.get()
      multiline = true
    } else if (this.check('eol')) {
      this.get()
      multiline = true
    }
    if (multiline) { // multiline
      block = this.yBlock()
      if (this.check('ここまで')) {this.get()}
    } else  // singleline
      {block = this.ySentence()}

    return {
      type: 'repeat_times',
      value: num,
      block: block,
      line: kai.line,
      josi: ''
    }
  }

  yWhile () {
    if (!this.check('間')) {return null}
    const aida = this.get()
    const cond = this.popStack([])
    if (cond === null) {
      throw new NakoSyntaxError('『間』で条件がありません。', cond.line, this.filename)
    }
    if (!this.checkTypes(['ここから', 'eol'])) {
      throw new NakoSyntaxError('『間』の直後は改行が必要です', cond.line, this.filename)
    }

    const block = this.yBlock()
    if (this.check('ここまで')) {this.get()}
    return {
      type: 'while',
      cond,
      block,
      josi: '',
      line: aida.line
    }
  }

  yFor () {
    if (!this.check('繰り返す')) {return null}
    const kurikaesu = this.get()
    const vTo = this.popStack(['まで'])
    const vFrom = this.popStack(['から'])
    const word = this.popStack(['を', 'で'])
    if (vFrom === null || vTo === null){
      throw new NakoSyntaxError('『繰り返す』文でAからBまでの指定がありません。',
        kurikaesu.line, this.filename)
    }

    let multiline = false
    if (this.check('ここから')) {
      multiline = true
      this.get()
    } else if (this.check('eol')) {
      multiline = true
      this.get()
    }
    let block = null
    if (multiline) {
      block = this.yBlock()
      if (this.check('ここまで')) {this.get()}
    } else
      {block = this.ySentence()}

    return {
      type: 'for',
      from: vFrom,
      to: vTo,
      word,
      block,
      line: kurikaesu.line,
      josi: ''
    }
  }

  yReturn () {
    if (!this.check('戻る')) {return null}
    const modoru = this.get()
    const v = this.popStack(['で', 'を'])
    return {
      type: 'return',
      value: v,
      line: modoru.line,
      josi: ''
    }
  }

  yForEach () {
    if (!this.check('反復')) {return null}
    const hanpuku = this.get()
    const target = this.popStack(['を'])
    const name = this.popStack(['で'])
    let block = null
    let multiline = false
    if (this.check('ここから')) {
      multiline = true
      this.get()
    } else if (this.check('eol'))
      {multiline = true}

    if (multiline) {
      block = this.yBlock()
      if (this.check('ここまで')) {this.get()}
    } else
      {block = this.ySentence()}

    return {
      type: 'foreach',
      name,
      target,
      block,
      line: hanpuku.line,
      josi: ''
    }
  }

  yMumeiFunc () { // 無名関数の定義
    if (!this.check('def_func')) {return null}
    const def = this.get()
    let args = []
    // 関数の引数定義は省略できる
    if (this.check('('))
      {args = this.yDefFuncReadArgs()}

    this.saveStack()
    const block = this.yBlock()
    if (this.check('ここまで')) {this.get()}
    this.loadStack()

    return {
      type: 'func_obj',
      args,
      block,
      meta: def.meta,
      line: def.line,
      josi: ''
    }
  }

  yCall () {
    if (this.isEOF()) {return null}
    while (!this.isEOF()) {
      // 代入
      if (this.check('代入')) {
        const dainyu = this.get()
        const value = this.popStack(['を'])
        const word = this.popStack(['へ', 'に'])
        if (!word || (word.type !== 'word' && word.type !== 'func' && word.type !== 'ref_array')) {
          throw new NakoSyntaxError('代入文で代入先の変数が見当たりません。',
            dainyu.line, this.filename)
        }

        switch (word.type) {
          case 'func': // 関数の代入的呼び出し
            switch (word.meta.josi.length) {
              case 0:
                throw new NakoSyntaxError(`引数がない関数『${word.name}』を代入的呼び出しすることはできません。`, dainyu.line, this.filename)
              case 1:
                return {type: 'func', name: word.name, args: [value], setter: true, line: dainyu.line, josi: ''}
              default:
                throw new NakoSyntaxError(`引数が2つ以上ある関数『${word.name}』を代入的呼び出しすることはできません。`, dainyu.line, this.filename)
            }
          case 'ref_array': // 配列への代入
            return {type: 'let_array', name: word.name, index: word.index, value: value, line: dainyu.line, josi: ''}
          default:
            return {type: 'let', name: word, value: value, line: dainyu.line, josi: ''}
        }
      }
      // 制御構文
      if (this.check('ここから')) {this.get()}
      if (this.check('回')) {return this.yRepeatTime()}
      if (this.check('間')) {return this.yWhile()}
      if (this.check('繰り返す')) {return this.yFor()}
      if (this.check('反復')) {return this.yForEach()}
      // 戻す
      if (this.check('戻る')) {return this.yReturn()}
      // C言語風関数
      if (this.check2([['func', 'word'], '(']) && this.peek().josi === '') { // C言語風
        const t = this.yValue()
        if (t.type === 'func' && (t.josi === '' || keizokuJosi.indexOf(t.josi) >= 0)) {
          t.josi = ''
          return t // 関数なら値とする
        }
        this.pushStack(t)
        if (this.check('comma')) {this.get()}
        continue
      }
      // なでしこ式関数
      if (this.check('func')) {
        const r = this.yCallFunc()
        if (r === null) {continue}
        return r
      }
      // 値のとき → スタックに載せる
      const t = this.yGetArg()
      if (t) {
        this.pushStack(t)
        continue
      }
      break
    } // end of while
    // 助詞が余ってしまった場合
    if (this.stack.length > 0) {
      let names = ''
      let line = 0
      this.stack.forEach(n => {
        names += this.nodeToStr(n)
        line = n.line
      })
      if (this.debug) {
        console.log('--- stack dump ---')
        console.log(JSON.stringify(this.stack, null, 2))
        console.log('peek: ', JSON.stringify(this.peek(), null, 2))
      }
      let msg = `${names}がありますが使い方が分かりません。`
      if (names.indexOf('演算子') > 0 || names.match(/^『\d+』$/)) {
        msg = `${names}がありますが文が解決していません。『代入』や『表示』などと一緒に使ってください。`
      }
      throw new NakoSyntaxError(msg, line, this.filename)
    }
    return this.popStack([])
  }

  yCallFunc () {
    const t = this.get()
    const f = t.meta
    // (関数)には ... 構文 ... https://github.com/kujirahand/nadesiko3/issues/66
    let funcObj = null
    if (t.josi === 'には') {
      try {
        funcObj = this.yMumeiFunc()
      } catch (err) {
        throw new NakoSyntaxError(`『${t.value}には...』で無名関数の定義で以下の間違いがあります。\n${err.message}`, t.line, this.filename)
      }
      if (funcObj === null) {throw new NakoSyntaxError('『Fには』構文がありましたが、関数定義が見当たりません。', t.line, this.filename)}
    }
    if (!f || typeof f['josi'] === 'undefined')
      {throw new NakoSyntaxError('関数の定義でエラー。', t.line)}

    const args = []
    let nullCount = 0
    let valueCount = 0
    for (let i = 0; i < f.josi.length; i++) {
      let popArg = this.popStack(f.josi[i])
      if (popArg === null) {
        nullCount++
        popArg = funcObj
      } else
        {valueCount++}

      if (popArg !== null && f.funcPointers !== undefined && f.funcPointers[i] !== null)
        {if (popArg.type === 'func') { // 引数が関数の参照渡しに該当する場合、typeを『func_pointer』に変更
          popArg.type = 'func_pointer'
        } else {
          throw new NakoSyntaxError(
            `関数『${t.value}』の引数『${f.varnames[i]}』には関数オブジェクトが必要です。`,
            t.line, this.filename)
        }}

      args.push(popArg)
    }
    // 1つだけなら、変数「それ」で補完される
    if (nullCount >= 2 && (0 < valueCount || t.josi === '' || keizokuJosi.indexOf(t.josi) >= 0))
      {throw new NakoSyntaxError(`関数『${t.value}』の引数が不足しています。`, t.line, this.filename)}

    const funcNode = {type: 'func', name: t.value, args: args, josi: t.josi, line: t.line}
    // 言い切りならそこで一度切る
    if (t.josi === '')
      {return funcNode}

    // **して、** の場合も一度切る
    if (keizokuJosi.indexOf(t.josi) >= 0) {
      funcNode.josi = 'して'
      return funcNode
    }
    // 続き
    funcNode.meta = f
    this.pushStack(funcNode)
    return null
  }

  yLet () {
    // 関数への代入的呼び出しの場合
    if (this.check2(['func', 'eq'])) {
      const word = this.peek()
      const name = this.nodeToStr(word)
      try {
        if (this.accept(['func', 'eq', this.yCalc])) {
          switch (this.y[0].meta.josi.length) {
            case 0:
              throw new NakoSyntaxError(`引数がない関数『${this.y[0].value}』を代入的呼び出しすることはできません。`, this.y[0].line, this.filename)
            case 1:
              return {
                type: 'func',
                name: this.y[0].value,
                args: [this.y[2]],
                setter: true,
                line: this.y[0].line
              }
            default:
              throw new NakoSyntaxError(`引数が2つ以上ある関数『${this.y[0].value}』を代入的呼び出しすることはできません。`, this.y[0].line, this.filename)
          }
        } else
          {throw new NakoSyntaxError(
            `関数${name}の代入的呼び出しで計算式が読み取れません。`, word.line, this.filename)}

      } catch (err) {
        throw new NakoSyntaxError(
          `関数${name}の代入的呼び出しにエラーがあります。\n${err.message}`, word.line, this.filename)
      }
    }
    // 通常の変数
    if (this.check2(['word', 'eq'])) {
      const word = this.peek()
      const name = this.nodeToStr(word)
      try {
        if (this.accept(['word', 'eq', this.yCalc]))
          {return {
            type: 'let',
            name: this.y[0],
            value: this.y[2],
            line: this.y[0].line
          }}
        else
          {throw new NakoSyntaxError(
            `${name}への代入文で計算式に書き間違いがあります。`, word.line, this.filename)}

      } catch (err) {
        throw new NakoSyntaxError(
          `${name}への代入文で計算式に以下の書き間違いがあります。\n${err.message}`,
          word.line, this.filename)
      }
    }

    if (this.check2(['word', '@'])) {
      // 一次元配列
      if (this.accept(['word', '@', this.yValue, 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2]],
          value: this.y[4],
          line: this.y[0].line
        }}

      // 二次元配列
      if (this.accept(['word', '@', this.yValue, '@', this.yValue, 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2], this.y[4]],
          value: this.y[6],
          line: this.y[0].line
        }}

      // 三次元配列
      if (this.accept(['word', '@', this.yValue, '@', this.yValue, '@', this.yValue, 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2], this.y[4], this.y[6]],
          value: this.y[8],
          line: this.y[0].line
        }}

    }
    if (this.check2(['word', '['])) {
      // 一次元配列
      if (this.accept(['word', '[', this.yCalc, ']', 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2]],
          value: this.y[5],
          line: this.y[0].line
        }}

      // 二次元配列
      if (this.accept(['word', '[', this.yCalc, ']', '[', this.yCalc, ']', 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2], this.y[5]],
          value: this.y[8],
          line: this.y[0].line
        }}

      // 三次元配列
      if (this.accept(['word', '[', this.yCalc, ']', '[', this.yCalc, ']', '[', this.yCalc, ']', 'eq', this.yCalc]))
        {return {
          type: 'let_array',
          name: this.y[0],
          index: [this.y[2], this.y[5], this.y[8]],
          value: this.y[11],
          line: this.y[0].line
        }}

    }
    // ローカル変数定義
    if (this.accept(['word', 'とは'])) {
      const word = this.y[0]
      if (!this.checkTypes(['変数', '定数'])) {
        throw new NakoSyntaxError('ローカル変数『' + word.value + '』の定義エラー',
          word.line, this.filename)
      }

      const vtype = this.get() // 変数
      // 初期値がある？
      let value = null
      if (this.check('eq')) {
        this.get()
        value = this.yCalc()
      }
      return {
        type: 'def_local_var',
        name: word,
        vartype: vtype.type,
        value,
        line: word.line
      }
    }
    // ローカル変数定義（その２）
    if (this.accept(['変数', 'word', 'eq', this.yCalc]))
      {return {
        type: 'def_local_var',
        name: this.y[1],
        vartype: '変数',
        value: this.y[3],
        line: this.y[0].line
      }}

    if (this.accept(['定数', 'word', 'eq', this.yCalc]))
      {return {
        type: 'def_local_var',
        name: this.y[1],
        vartype: '定数',
        value: this.y[3],
        line: this.y[0].line
      }}

    return null
  }

  yCalc () {
    if (this.check('eol')) {return null}
    // 値を一つ読む
    const t = this.yGetArg()
    if (!t) {return null}
    // 助詞がある？ つまり、関数呼び出しがある？
    if (t.josi === '') {return t} // 値だけの場合
    // 関数の呼び出しがあるなら、スタックに載せて関数読み出しを呼ぶ
    this.pushStack(t)
    const t1 = this.yCall()
    // それが連文か確認
    if (t1.josi !== 'して') {return t1} // 連文ではない
    // 連文なら右側を読んで左側とくっつける
    const t2 = this.yCalc()
    if (!t2) {return t1}
    return {
      type: 'renbun',
      left: t1,
      right: t2,
      josi: t2.josi,
      line: t1.line
    }
  }

  yValueKakko () {
    if (!this.check('(')) {return null}
    const t = this.get() // skip '('
    this.saveStack()
    const v = this.yCalc()
    if (v === null) {
      const v2 = this.get()
      throw new NakoSyntaxError('(...)の解析エラー。' + this.nodeToStr(v2) + 'の近く', t.line, this.filename)
    }
    if (!this.check(')'))
      {throw new NakoSyntaxError('(...)の解析エラー。' + this.nodeToStr(v) + 'の近く', t.line, this.filename)}

    const closeParent = this.get() // skip ')'
    this.loadStack()
    v.josi = closeParent.josi
    return v
  }

  yValue () {
    // プリミティブな値
    if (this.checkTypes(['number', 'string']))
      {return this.get()}

    // 丸括弧
    if (this.check('(')) {return this.yValueKakko()}
    // マイナス記号
    if (this.check2(['-', 'number']) || this.check2(['-', 'word']) || this.check2(['-', 'func'])) {
      const m = this.get() // skip '-'
      const v = this.yValue()
      return {
        type: 'op',
        operator: '*',
        left: {type: 'number', value: -1, line: m.line},
        right: v,
        josi: v.josi,
        line: m.line
      }
    }
    // NOT
    if (this.check('not')) {
      const m = this.get() // skip '!'
      const v = this.yValue()
      return {
        type: 'not',
        value: v,
        josi: v.josi,
        line: m.line
      }
    }
    // JSON object
    const a = this.yJSONArray()
    if (a) {return a}
    const o = this.yJSONObject()
    if (o) {return o}
    // 一語関数
    const splitType = operatorList.concat(['eol', ')', ']'])
    if (this.check2(['func', splitType])) {
      const f = this.get()
      return {
        type: 'func',
        name: f.value,
        args: [],
        line: f.line,
        josi: f.josi
      }
    }
    // C風関数呼び出し FUNC(...)
    if (this.check2([['func', 'word'], '(']) && this.peek().josi === '') {
      const f = this.peek()
      if (this.accept([['func', 'word'], '(', this.yGetArgParen, ')']))
        {return {
          type: 'func',
          name: this.y[0].value,
          args: this.y[2],
          line: this.y[0].line,
          josi: this.y[3].josi
        }}
       else
        {throw new NakoSyntaxError('C風関数呼び出しのエラー', f.line, this.filename)}

    }
    // 埋め込み文字列
    if (this.check('embed_code')) {return this.get()}
    // 無名関数(関数オブジェクト)
    if (this.check('def_func')) {return this.yMumeiFunc()}
    // 変数
    const word = this.yValueWord()
    if (word) {return word}
    // その他
    return null
  }

  yValueWord () {
    if (this.check('word')) {
      const word = this.get()
      if (this.skipRefArray) {return word}
      if (word.josi === '' && this.checkTypes(['@', '['])) {
        const list = []
        let josi = ''
        while (!this.isEOF()) {
          let idx = null
          if (this.accept(['@', this.yValue])) {
            idx = this.y[1]
            josi = idx.josi
          }
          if (this.accept(['[', this.yCalc, ']'])) {
            idx = this.y[1]
            josi = this.y[2].josi
          }
          if (idx === null) {break}
          list.push(idx)
        }
        if (list.length === 0) {throw new NakoSyntaxError(`配列『${word.value}』アクセスで指定ミス`, word.line, this.filename)}
        return {
          type: 'ref_array',
          name: word,
          index: list,
          josi: josi,
          line: word.line
        }
      }
      return word
    }
    return null
  }

  yJSONObjectValue () {
    const a = []
    const firstToken = this.peek()
    while (!this.isEOF()) {
      while (this.check('eol')) {this.get()}
      if (this.check('}')) {break}
      if (this.accept(['word', ':', this.yCalc])) {
        this.y[0].type = 'string' // キー名の文字列記号省略の場合
        a.push({
          key: this.y[0],
          value: this.y[2]
        })
      } else if (this.accept(['string', ':', this.yCalc]))
        {a.push({
          key: this.y[0],
          value: this.y[2]
        })}
       else if (this.check('word')) {
        const w = this.get()
        w.type = 'string'
        a.push({
          key: w,
          value: w
        })
      } else if (this.checkTypes(['string', 'number'])) {
        const w = this.get()
        a.push({
          key: w,
          value: w
        })
      } else
        {throw new NakoSyntaxError('辞書オブジェクトの宣言で末尾の『}』がありません。', firstToken.line, this.filename)}

      if (this.check('comma')) {this.get()}
    }
    return a
  }

  yJSONObject () {
    if (this.accept(['{', '}']))
      {return {
        type: 'json_obj',
        value: [],
        josi: this.y[1].josi,
        line: this.y[0].line
      }}

    if (this.accept(['{', this.yJSONObjectValue, '}']))
      {return {
        type: 'json_obj',
        value: this.y[1],
        josi: this.y[2].josi,
        line: this.y[0].line
      }}

    return null
  }

  yJSONArrayValue () {
    if (this.check('eol')) {this.get()}
    const v1 = this.yCalc()
    if (v1 === null) {return null}
    if (this.check('comma')) {this.get()}
    const a = [v1]
    while (!this.isEOF()) {
      if (this.check('eol')) {this.get()}
      if (this.check(']')) {break}
      const v2 = this.yCalc()
      if (v2 === null) {break}
      if (this.check('comma')) {this.get()}
      a.push(v2)
    }
    return a
  }

  yJSONArray () {
    if (this.accept(['[', ']']))
      {return {
        type: 'json_array',
        value: [],
        josi: this.y[1].josi,
        line: this.y[0].line
      }}

    if (this.accept(['[', this.yJSONArrayValue, ']']))
      {return {
        type: 'json_array',
        value: this.y[1],
        josi: this.y[2].josi,
        line: this.y[0].line
      }}

    return null
  }

  yTryExcept () {
    if (!this.check('エラー監視')) {return null}
    const kansi = this.get() // skip エラー監視
    const block = this.yBlock()
    if (!this.check2(['エラー', 'ならば']))
      {throw new NakoSyntaxError(
        'エラー構文で『エラーならば』がありません。' +
        '『エラー監視..エラーならば..ここまで』を対で記述します。',
        kansi.line, this.filename)}

    this.get() // skip エラー
    this.get() // skip ならば
    const errBlock = this.yBlock()
    if (this.check('ここまで')) {this.get()}
    return {
      type: 'try_except',
      block,
      errBlock,
      line: kansi.line,
      josi: ''
    }
  }
}

module.exports = NakoParser
