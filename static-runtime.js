/* Static presentation adapter. All study interactions stay in this browser. */
const nativeFetch = window.fetch.bind(window);
const publicBase = new URL('.', location.href).href;
const exported = await (await nativeFetch(new URL('data.json',publicBase))).text();
const dataset = JSON.parse(exported.replaceAll('__PUBLIC_BASE__',publicBase));
const comprehensionKey=await (await nativeFetch(new URL('comprehension-key.json',publicBase))).json();
const query = new URL(location.href).searchParams;
const frameGroup=query.get('group')||'ai';
const group=frameGroup==='control'?2:1;
const competition=query.get('competition')==='1'?'1':'0';
const data=dataset.groups[competition][String(group)];
const prefix=`field_static_${frameGroup}_`;
const clone=value=>JSON.parse(JSON.stringify(value));
for(const method of ['getItem','setItem','removeItem']){
 const original=Storage.prototype[method];
 Storage.prototype[method]=function(key,...args){return original.call(this,String(key).startsWith('app_')?prefix+key:key,...args);};
}
let currentCode=query.get('screen')||'screen-notice-1';
const user=()=>({id:group,account:`presentation_${group===1?'ai':'control'}`,name:'Static presentation',treatment:group,competitiontreatment:Number(competition),status:2,locked:0,currentscreen:currentCode,currentscreendetail:clone(data.screens.find(s=>s.screencode===currentCode)||{})});
if(frameGroup!=='login'){
 sessionStorage.setItem('app_token','static-presentation');
 sessionStorage.setItem('app_user_info',JSON.stringify({...user(),loginTime:Date.now()}));
}else{sessionStorage.removeItem('app_token');sessionStorage.removeItem('app_user_info');}
sessionStorage.removeItem('app_route_config');
const answerKey=`field_static_answers_${group}_${competition}`;
let saved={practice:{},test:{},chat:{}};
try{saved={...saved,...JSON.parse(sessionStorage.getItem(answerKey)||'{}')};}catch{}
const save=()=>sessionStorage.setItem(answerKey,JSON.stringify(saved));
const ok=(info={},msg='Presentation ready')=>({code:1,msg,info});
const list=(items)=>ok({list:clone(items)});
const progress=new Map();
function sessionInfo(params){
 const session=Number(params.session||1),phase=params.phase||(session===3?'content':'main');
 const key=`${session}-${phase}`;
 if(!progress.has(key)){
  const minutes=Number(data.durations.find(d=>Number(d.session)===session&&d.phase===phase)?.minutes||25);
  const now=Math.floor(Date.now()/1000);
  progress.set(key,{id:session,session,phase,status:2,stime:now,deadline:now+minutes*60,submittime:0,lastscreen:currentCode,lastquestion:0,score:0,correctcount:0,servertime:now});
 }
 return progress.get(key);
}
function grade(detail){
 const answer=String(saved.practice[detail.questionid]??'');
 const question=data.practice.find(q=>q.id===detail.questionid);
 if(!answer)return {score:0,iscorrect:2};
 if(question?.type==='multiple_choice'){
  try{
   const a=JSON.parse(answer).map(Number).sort((x,y)=>x-y);
   const b=JSON.parse(detail.correctanswer).map(Number).sort((x,y)=>x-y);
   if(!a.length||a.some(x=>!b.includes(x)))return {score:0,iscorrect:2};
   return a.length===b.length?{score:detail.maxscore,iscorrect:1}:{score:Math.round(detail.maxscore*.4),iscorrect:2};
  }catch{return {score:0,iscorrect:2};}
 }
 return answer.trim()===String(detail.correctanswer).trim()?{score:detail.maxscore,iscorrect:1}:{score:0,iscorrect:2};
}
function result(){
 const r=clone(data.practiceResult);
 r.details=r.details.map(d=>({...d,myanswer:String(saved.practice[d.questionid]??''),...grade(d)}));
 r.score=r.details.reduce((n,d)=>n+d.score,0);r.correctcount=r.details.filter(d=>d.iscorrect===1).length;
 return r;
}
function parameters(url,body){
 const parsed=new URL(url,location.href);let params=Object.fromEntries(parsed.searchParams);
 if(typeof body==='string'){
  try{params={...params,...JSON.parse(body)};}catch{params={...params,...Object.fromEntries(new URLSearchParams(body))};}
 }else if(body instanceof URLSearchParams)params={...params,...Object.fromEntries(body)};
 else if(body&&typeof body==='object')params={...params,...body};
 return {endpoint:parsed.pathname.split('/').pop(),params};
}
function respond(url,body){
 const {endpoint,params:p}=parameters(url,body);
 const act=p.act;
 if(endpoint==='content_do.php'){
  if(act==='getsessionduration')return list(data.durations);
  if(act==='getscreenconfig')return list(data.screens);
  if(act==='getscreens')return list(data.screens.filter(s=>!Number(p.session)||Number(s.session)===Number(p.session)));
  if(act==='getscreen')return ok(clone(data.screens.find(s=>s.screencode===(p.screencode||p.screen))||{}));
  if(act==='getscreenroute')return list(data.screens.flatMap(s=>s.routes||[]));
  if(act==='getlearningmaterial')return list(data.materials.filter(m=>(!p.screencode||m.screen===p.screencode)&&(!p.region||m.region===p.region)));
  if(act==='getassets'||act==='getcontentimage')return list(data.assets.filter(a=>(!p.scene||a.scene===p.scene)&&(!Number(p.session)||Number(a.session)===Number(p.session))));
 }
 if(endpoint==='participantlogin_do.php'){
  sessionStorage.setItem('app_token','static-presentation');
  return ok({token:'static-presentation',user:user()},'Presentation sign-in complete');
 }
 if(endpoint==='actiontoken_new.php')return ok({actiontoken:'static-presentation'});
 if(endpoint==='participant_do.php'){
  if(act==='currentscreen')return ok({currentscreen:clone(data.screens.find(s=>s.screencode===currentCode)||{})});
  if(p.currentscreen)currentCode=p.currentscreen;
  return ok();
 }
 if(endpoint==='participantlogout_do.php')return ok();
 if(endpoint==='participant_wait_do.php')return ok({locked:1,currentscreen:'screen-session3-end'});
 if(endpoint==='sessionprogress_do.php'){
  if(act==='getprogress')return list([...progress.values()]);
  const s=sessionInfo(p);
  if(act==='submitsession'){s.status=3;s.submittime=Math.floor(Date.now()/1000);if(s.session===2){Object.assign(s,result());delete s.details;}}
  if(act==='updatesession'){if(p.lastscreen)s.lastscreen=p.lastscreen;if(p.lastquestion)s.lastquestion=Number(p.lastquestion);}
  return ok(clone(s));
 }
 if(endpoint==='practice_do.php'){
  const kind=/test/.test(act)?'test':'practice';
  if(act==='listpractice'||act==='listtest')return list(data[kind]);
  if(act==='getpractice'||act==='gettest'){
   const q=clone(data[kind].find(q=>Number(q.id)===Number(p.questionid))||{});
   q.myanswer=saved[kind][q.id]??'';return ok(q);
  }
  if(act==='getpracticeresult')return ok(result());
  if(/^submit/.test(act)){saved[kind][p.questionid||p.question]=p.answer??'';save();return ok();}
 }
 if(endpoint==='comprehension_do.php'){
  if(act==='getquestions')return list(data.comprehension);
  const answers=Array.isArray(p.answers)?p.answers:[];
  const normalize=value=>{
   try{const parsed=typeof value==='string'?JSON.parse(value):value;if(Array.isArray(parsed))return JSON.stringify(parsed.map(String).sort());}catch{}
   return String(value).trim();
  };
  const incorrect=data.comprehension.filter(q=>{
   const answer=answers.find(a=>Number(a.questionid)===Number(q.id));
   return !answer || normalize(answer.answer)!==normalize(comprehensionKey[String(q.id)]);
  }).map(q=>({id:Number(q.id)}));
  return ok({passed:incorrect.length===0,incorrect},incorrect.length?'Some answers need another look.':'Comprehension check passed');
 }
 if(endpoint==='questionnaire_do.php'){
  if(act==='getbaseline')return list(data.baseline);
  if(act==='getpost')return list(data.post);
  if(act==='getbelief')return ok({stage:Number(p.stage),list:clone(data.belief[String(p.stage)]||[])});
  return ok({saved:Array.isArray(p.answers)?p.answers.length:0},'Preview only — no response was sent');
 }
 if(endpoint==='beliefdist_do.php'){
  if(act==='get')return ok(clone(data.distributions[String(p.stage)]||data.distributions['1']));
  return ok({id:1,stage:Number(p.stage)},'Preview only — no response was sent');
 }
 if(endpoint==='chat_do.php'){
  if(act==='openchat')return ok({chatid:Number(p.questionid||1),status:1,created:1});
  if(act==='listmsg')return list(saved.chat[p.chatid]||[]);
  if(act==='gethistory')return ok({chatid:Number(p.questionid),list:saved.chat[p.questionid]||[]});
  if(act==='getpreset')return list(data.presets[p.questionid||p.question]||[]);
  return ok();
 }
 // Tracking is deliberately discarded, without transmitting any browser data.
 if(['scoreanalysis_do.php','clickevent_do.php'].includes(endpoint))return ok({id:1});
 return ok();
}
class PresentationXHR extends EventTarget {
 constructor(){super();this.readyState=0;this.status=0;this.statusText='';this.responseType='';this.responseText='';this.response=null;this.timeout=0;this.withCredentials=false;this.upload=new EventTarget();this.onloadend=null;this.onreadystatechange=null;this.onerror=null;this.onabort=null;this.ontimeout=null;}
 open(method,url){this.method=method;this.url=url;this.readyState=1;this.notify('readystatechange');}
 setRequestHeader(){}
 getAllResponseHeaders(){return 'content-type: application/json; charset=utf-8\r\n';}
 getResponseHeader(name){return name.toLowerCase()==='content-type'?'application/json; charset=utf-8':null;}
 notify(type){const event=new Event(type);this.dispatchEvent(event);const handler=this['on'+type];if(typeof handler==='function')handler.call(this,event);}
 send(body){this.timer=setTimeout(()=>{
  try{const value=respond(this.url,body);this.status=200;this.statusText='OK';this.readyState=4;this.responseURL=new URL(this.url,location.href).href;this.responseText=JSON.stringify(value);this.response=this.responseType==='json'?value:this.responseText;this.notify('readystatechange');this.notify('load');this.notify('loadend');}
  catch(error){console.error('Static presentation adapter:',error);this.notify('error');}
 },12);}
 abort(){clearTimeout(this.timer);this.notify('abort');}
}
Object.assign(PresentationXHR,{UNSENT:0,OPENED:1,HEADERS_RECEIVED:2,LOADING:3,DONE:4});
window.XMLHttpRequest=PresentationXHR;
window.fetch=async(input,options={})=>{
 const url=typeof input==='string'?input:input.url;
 if(!/\.php(?:[?#]|$)/.test(url))return nativeFetch(input,options);
 const {endpoint,params}=parameters(url,options.body);
 if(endpoint==='chat_do.php'&&['sendmsg','sendmessage'].includes(params.act)){
  const id=String(params.chatid||params.questionid||1);
  const example='**Illustrative response — not a live AI reply.**\n\nA useful starting point is to list the paths between the two variables, then check whether each path is open or blocked under the stated controls.\n\nFor a chain or fork, conditioning on the middle variable blocks the path. A collider blocks a path unless the collider, or one of its descendants, is conditioned on.\n\nIn the study, the assistant can use the current question and learning materials to explain the reasoning. This static walkthrough shows an example of that interaction.';
  const previous=saved.chat[id]||[];const now=Math.floor(Date.now()/1000);
  saved.chat[id]=[...previous,{role:'user',content:params.content||params.message,addtime:now},{role:'assistant',content:example,addtime:now}];save();
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:example}}]})+'\n\ndata: [DONE]\n\n'));controller.close();}});
  return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});
 }
 return new Response(JSON.stringify(respond(url,options.body)),{headers:{'Content-Type':'application/json'}});
};
// The presenter must keep access to the outer navigation during the walkthrough.
for(const method of ['requestFullscreen','webkitRequestFullscreen','webkitRequestFullScreen','msRequestFullscreen']){
 try{Object.defineProperty(document.documentElement,method,{value:()=>Promise.resolve(),configurable:true});}catch{}
}
const report=()=>parent.postMessage({type:'field-demo-route',hash:location.hash,group:frameGroup},location.origin);
addEventListener('hashchange',report);addEventListener('load',report);
await import('./assets/index-en-20261118-r3.js');
report();
