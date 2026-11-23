/**
 * [INPUT]: 依赖 node:fs、node:path、node:vm、node:assert/strict 及同目录 beszel.bar
 * [OUTPUT]: 无导出，直接执行 Beszel 看板离线契约测试并以进程退出码反馈结果
 * [POS]: dashboards/beszel 的离线回归验证入口，可从仓库根目录或本目录直接运行
 * [PROTOCOL]: Update this header on change, then check GEMINI.md
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, 'beszel.bar'), 'utf8').match(/<script[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/script>/)[1];
const hub = 'http://100.64.0.1:8090';
const now = Date.now();
const system = {id:'fixturehost001',name:'NAS',host:'100.64.0.10',status:'up',updated:new Date(now).toISOString(),info:{cpu:21,mp:45,dp:61,bb:4096,u:90000}};
function setup(options = {}) {
  let secret = options.secret === undefined ? JSON.stringify({hub,token:'fixture-session',at:now}) : options.secret;
  const requests = [], stored = [];
  const context = vm.createContext({URL,Map,Date,JSON,Promise,AbortController,setTimeout,clearTimeout,atob,console,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    $metrix:{secret:()=>secret, invalidate:()=>{},schedule:()=>{},openURL:()=>{},panel:{open:()=>{}},
      setSecret:async (key,value)=>{ if(options.saveFails) throw Error('fixture'); secret=value; stored.push(JSON.parse(value)); },
      deleteSecret:async()=>{if(options.deleteFails)throw Error('fixture');secret='';}},
    fetch:async(url,request)=>{
      requests.push({url,request});
      const custom = options.respond && await options.respond(url,request,requests.length);
      const body = custom || (url.endsWith('/auth-with-password') || url.endsWith('/auth-refresh') ? {token:'fixture-refreshed'} : {items:url.includes('/systems/')?[system]:url.includes('/container_stats/')?[{created:new Date(now).toISOString(),stats:[{n:'web',c:4,m:32}]}]:[{system:system.id,created:new Date(now).toISOString(),stats:{cpu:21,mp:45,dp:61,b:[1024,3072],mem:[8192,4096]}}],totalPages:1});
      return {ok:!body.__status,status:body.__status||200,text:async()=>JSON.stringify(body)};
    }});
  vm.runInContext(source.replace('export default {','globalThis.dashboard = {'),context);
  const env = {inputs:{hubURL:hub,refreshInterval:'30'}};
  return {context,env,requests,stored,render:()=>context.dashboard.render(env),run:()=>context.dashboard.scheduled(env),
    call:expression=>vm.runInContext(expression,context),secret:()=>secret};
}
function flatten(n,out=[]) {if(n&&typeof n==='object'){out.push(n);for(const c of n.children||[])flatten(c,out);}return out;}
(async()=>{
  const state = setup(); await state.run();
  assert.equal(state.render().tray.title,'1/1 · 4.00 KB/s');
  assert.equal(state.call('network({ns:1,nr:2}).up'),1048576);
  assert.equal(state.call('network({b:[10,20],ns:1}).up'),10);
  assert.equal(state.call('uptime(90000)'),'1 天 1 小时');
  await state.call('chooseNode("fixturehost001")');
  assert(flatten(state.render().panel).some(n=>n.type==='Chart'));
  assert(JSON.stringify(state.render()).includes('32.0 MB'));
  state.call('search = "absent"; selected = ""');
  assert(JSON.stringify(state.render()).includes('没有匹配'));
  state.call('search = ""');
  // A network failure keeps the last successful menu-bar value and adds an error.
  state.context.fetch = async()=>{throw Error('offline')}; await state.run();
  assert.equal(state.render().tray.title,'1/1 · 4.00 KB/s');
  assert(state.render().tray.error.includes('Tailscale'));
  // Login input never echoes the password into a serialized view.
  const login = setup({secret:''}); login.render();
  const fields=flatten(login.render().panel).filter(n=>n.type==='TextInput');
  fields[0].props.onChange('fixture@example.invalid');fields[1].props.onChange('synthetic-password');
  assert(!JSON.stringify(login.render()).includes('synthetic-password'));
  await login.call('login()');
  assert.equal(login.stored.length,1);
  assert.equal(login.call('password'),'');
  assert(!login.secret().includes('synthetic-password'));
  assert.equal(JSON.parse(login.requests[0].request.body).password,'synthetic-password');
  assert.equal(login.requests[0].request.headers.Authorization,undefined);
  // Even a failed keychain deletion cannot silently log the user back in.
  const loggedOut=setup({deleteFails:true});await loggedOut.run();await loggedOut.call('logout()');
  assert.equal(loggedOut.render().tray.title,'Beszel');assert.equal(loggedOut.call('token'),'');
  // A session for another Hub never leaves the process in an HTTP header.
  const wrongHub=setup({secret:JSON.stringify({hub:'http://different.invalid',token:'other-token',at:now})});
  await wrongHub.run();assert.equal(wrongHub.requests.length,0);
  // A changed Hub clears both pending UI flags and existing session data.
  login.call('busy = true; loginBusy = true');login.env.inputs.hubURL='http://100.64.0.2:8090';login.render();
  assert.equal(login.call('busy || loginBusy'),false);assert.equal(login.call('token'),'');
  // A 401 triggers session renewal and one successful retry.
  let denied=false;const expired=setup({respond:async(url)=>{if(url.includes('/systems/')&&!denied){denied=true;return {__status:401};}}});
  await expired.run();assert.equal(expired.render().tray.error,'');
  assert.equal(expired.requests.filter(r=>r.url.endsWith('/auth-refresh')).length,1);
  assert.equal(expired.stored[0].token,'fixture-refreshed');
  const rejected=setup({secret:'',respond:async()=>({__status:400})});rejected.render();
  rejected.call('email="fixture@example.invalid"; password="synthetic-password"');await rejected.call('login()');
  assert.equal(rejected.call('token'),'');assert(rejected.call('loginError').includes('邮箱或密码不正确'));
  assert(!JSON.stringify(rejected.render()).includes('synthetic-password'));
  const volatile=setup({secret:'',saveFails:true});volatile.render();
  volatile.call('email="fixture@example.invalid"; password="synthetic-password"');await volatile.call('login()');
  assert.equal(volatile.render().tray.error,'');assert(volatile.call('sessionWarning').includes('无法保存'));
  let release;const gate=new Promise(resolve=>release=resolve);
  const switching=setup({secret:'',respond:async(url)=>url.endsWith('/auth-with-password')?await gate:undefined});switching.render();
  switching.call('email="fixture@example.invalid"; password="synthetic-password"');const pending=switching.call('login()');
  switching.env.inputs.hubURL='http://100.64.0.3:8090';switching.render();release({token:'stale-login'});await pending;
  assert.equal(switching.stored.length,0);assert.equal(switching.call('token'),'');assert.equal(switching.call('loginBusy'),false);
  console.log('PASS: overview, detail charts, containers, units, empty search, offline cache, password privacy, login, logout, Hub binding and 401 renewal');
})().catch(e=>{console.error(e);process.exitCode=1;});
