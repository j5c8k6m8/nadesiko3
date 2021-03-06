// nadesiko for web browser
// wnako3.js
const NakoCompiler = require('./nako3')
const PluginBrowser = require('./plugin_browser')
const NAKO_SCRIPT_RE = /^(なでしこ|nako|nadesiko)3?$/

class WebNakoCompiler extends NakoCompiler {
  constructor () {
    super()
    this.__varslist[0]['ナデシコ種類'] = 'wnako3'
  }

  /**
   * ブラウザでtype="なでしこ"というスクリプトを得て実行する
   */
  runNakoScript () {
    // スクリプトタグの中身を得る
    let nakoScriptCount = 0
    let scripts = document.querySelectorAll('script')
    for (let i = 0; i < scripts.length; i++) {
      let script = scripts[i]
      if (script.type.match(NAKO_SCRIPT_RE)) {
        nakoScriptCount++
        this.run(script.text)
      }
    }
    console.log('実行したなでしこの個数=', nakoScriptCount)
  }

  /**
   * type=なでしこ のスクリプトを自動実行するべきかどうかを返す
   * @returns {boolean} type=なでしこ のスクリプトを自動実行するべきかどうか
   */
  checkScriptTagParam () {
    let scripts = document.querySelectorAll('script')
    for (let i = 0; i < scripts.length; i++) {
      let script = scripts[i]
      let src = script.src || ''
      if (src.indexOf('wnako3.js?run') >= 0) 
        {return true}
      
    }
    return false
  }

  /**
   * コードを生成 (override)
   * @param ast AST
   * @param isTest テストかどうか
   * @returns {string} コード
   */
  generate(ast, isTest) {
    let code = super.generate(ast, isTest)

    if (isTest && code !== '') {
      code = '// mocha初期化\n' +
        'const stats = document.getElementById(\'mocha-stats\');\n' +
        'if(stats !== null) {\n' +
        ' document.getElementById(\'mocha\').removeChild(stats);\n' +
        '}\n' +
        'mocha.suite.suites = [];\n' +
        'mocha.setup("bdd");\n' +
        'mocha.growl();\n'+
        'mocha.checkLeaks();\n' +
        '\n' +
        code + '\n' +
        'mocha.run();// テスト実行\n'
    }

    return code
  }
}

// ブラウザなら navigator.nako3 になでしこを登録
if (typeof (navigator) === 'object') {
  const nako3 = navigator.nako3 = new WebNakoCompiler()
  nako3.addPluginObject('PluginBrowser', PluginBrowser)
  window.addEventListener('DOMContentLoaded', (e) => {
    const isAutoRun = nako3.checkScriptTagParam()
    if (isAutoRun) {nako3.runNakoScript()}
  }, false)
} else 
  {module.exports = WebNakoCompiler}

