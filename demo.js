(() => {
  const $ = id => document.getElementById(id);
  const frame = $('participant');
  const runs = {};
  let group = 'ai', current = 0, busy = false;
  const descriptions = {
  "screen-login": [
    "Log in",
    "Participants sign in with the account provided by the researcher.",
    "Associate each participant with their assigned condition and study progress."
  ],
  "screen-notice-1": [
    "Welcome",
    "Read the study introduction, expected duration and participation requirements.",
    "Introduce the study and what taking part involves."
  ],
  "screen-notice-2": [
    "Study procedure",
    "Review the order and tasks of the four sessions.",
    "Explain how learning, practice, self-study and the final test fit together."
  ],
  "screen-notice-3": [
    "Predictions and payment",
    "Review the base payment, performance bonuses and prediction scoring example.",
    "Explain the incentives and encourage honest probability estimates."
  ],
  "screen-notice-4": [
    "Study rules",
    "Read the rules for completing the study.",
    "Clarify the permitted activities and participation requirements."
  ],
  "screen-notice-5": [
    "Data and privacy",
    "Read the information about data collection and privacy.",
    "Explain how study data will be used before participation begins."
  ],
  "screen-quiz": [
    "Comprehension check",
    "Answer questions about the study rules. Review incorrect answers and try again.",
    "Confirm that participants understand the procedure and payment rules."
  ],
  "screen-consent": [
    "Informed consent",
    "Confirm agreement to take part under the stated conditions.",
    "Record informed consent before the study tasks begin."
  ],
  "screen-baseline-questionnaire": [
    "Pre-study questionnaire",
    "Answer the configured background and digital literacy questions.",
    "Measure participant characteristics before the experimental tasks."
  ],
  "screen-session1-intro": [
    "Learning instructions",
    "Read the instructions for the initial learning session.",
    "Explain the first learning task."
  ],
  "screen-session1-content": [
    "Initial learning",
    "Read the causal diagram materials, expand explanations and explore examples.",
    "Introduce the concepts needed for the practice questions and final test."
  ],
  "screen-session1-checkpoint": [
    "Predictions after learning",
    "Predict the distribution of final test scores and percentile ranks.",
    "Measure beliefs after the initial learning session."
  ],
  "screen-session2-intro": [
    "Practice instructions",
    "Read the practice rules and the assistance available in this condition.",
    "Introduce the assigned practice condition."
  ],
  "screen-session2-practice": [
    "Practice",
    "Answer the practice questions in order.",
    "Observe performance, time spent and behaviour under the assigned assistance condition."
  ],
  "screen-session2-practice-score": [
    "Practice results",
    "Review this presentation account's practice results.",
    "Provide performance feedback. An unanswered demonstration may show a score of zero."
  ],
  "screen-session2-checkpoint": [
    "Predictions after practice",
    "Predict final test scores and ranks again after practice.",
    "Measure how beliefs change after the practice experience."
  ],
  "screen-session2-belief-questionnaire": [
    "Prediction questionnaire",
    "Complete the configured prediction questionnaire.",
    "Collect additional self-assessments after practice."
  ],
  "screen-session2-rest": [
    "Break",
    "Take a short break before the next stage.",
    "Provide a standard interval between stages. Use the outer Next button to skip the wait during the presentation."
  ],
  "screen-session3-review": [
    "Post-practice review",
    "View the post-practice page assigned to this group.",
    "Show how the feedback experience differs between conditions."
  ],
  "screen-session3-intro": [
    "Self-study instructions",
    "Read the instructions for the self-study stage.",
    "Introduce the next opportunity to study."
  ],
  "screen-session3-content": [
    "Self-study",
    "Revisit the learning materials and examples as needed.",
    "Observe further learning after practice and feedback."
  ],
  "screen-session3-checkpoint": [
    "Predictions after self-study",
    "Report probability estimates for final scores and ranks again.",
    "Measure beliefs after further learning."
  ],
  "screen-session3-end": [
    "Wait for the test",
    "Wait for the researcher to start the next stage.",
    "Coordinate the start of the final test. The presenter can jump directly to the test."
  ],
  "screen-session4-intro": [
    "Test instructions",
    "Read the final test requirements.",
    "Introduce the final assessment."
  ],
  "screen-session4-test": [
    "Final test",
    "Answer the test questions independently.",
    "Measure learning outcomes and transfer."
  ],
  "screen-post-questionnaire": [
    "Post-study questionnaire",
    "Complete the questionnaire after the test.",
    "Collect participants' final assessments and other relevant information."
  ],
  "screen-session4-checkpoint": [
    "Predictions after the test",
    "Estimate the score and rank distributions after completing the test.",
    "Measure beliefs after participants have answered the test questions."
  ],
  "screen-end": [
    "Study complete",
    "View the completion page.",
    "Conclude the study and show the configured closing page."
  ]
};
  const defaultNotes = ['Configured page','View the study page available to this group.','Content follows the current local configuration.'];
  function note(screen) { return descriptions[screen.code] || [screen.name, ...defaultNotes.slice(1)]; }
  function normalizePaths(run) {
    for (const list of [run?.screens, run?.otherScreens]) for (const screen of list || []) {
      if (!screen.path.startsWith('/experiment/session/')) screen.path = screen.path.replace(/^\/experiment\//, '/');
    }
    return run;
  }
  function screens() { return runs[group]?.screens || []; }
  function different(screen) {
    const other = runs[group]?.otherScreens?.find(s => s.code === screen.code);
    return !other || JSON.stringify(screen.blocks)!==JSON.stringify(other.blocks) || ['screen-session2-practice','screen-session3-review'].includes(screen.code);
  }
  const publicDataPromise=fetch('data.json').then(r=>{if(!r.ok)throw new Error('Could not load study content.');return r.json();});
  async function api(body) {
    const dataset=await publicDataPromise;
    const condition=String($('competition').value);
    const number=group==='ai'?'1':'2';
    const content=dataset.groups[condition][number];
    const makeUser=(code)=>({id:Number(number),account:'static_presentation_'+group,name:'Static presentation',treatment:Number(number),competitiontreatment:Number(condition),status:2,locked:0,currentscreen:code,currentscreendetail:content.screens.find(s=>s.screencode===code)||{}});
    if(body.act==='start')return {login:{token:'static-presentation',user:makeUser('screen-notice-1')},screens:content.steps,otherScreens:dataset.groups[condition][number==='1'?'2':'1'].steps};
    if(body.act==='prepare')return {user:makeUser(body.screen),screen:content.steps.find(s=>s.code===body.screen)};
    throw new Error('Unknown walkthrough action.');
  }
  function status(message, error = false) {
    $('status').hidden = !message;
    $('status').textContent = message;
    $('status').style.color = error ? '#841435' : '#5c5360';
  }
  function controls() {
    document.body.classList.toggle('busy',busy);
    $('start-ai').disabled=busy;$('start-control').disabled=busy;$('restart').disabled=busy;
    $('previous').disabled=busy || !screens().length || current===0;
    $('next').disabled=busy || !screens().length || current===screens().length-1;
    for(const b of document.querySelectorAll('[data-group]')){
      b.classList.toggle('selected',b.dataset.group===group);
      b.setAttribute('aria-pressed',String(b.dataset.group===group));
    }
    $('group-label').textContent = group==='ai'?'AI group':'Control group';
    $('step-count').textContent = screens().length ? `${screens().length} steps` : 'Ready to start';
  }
  function renderNavigation() {
    $('steps').replaceChildren();let previousPhase;
    screens().forEach((screen,index)=>{
      const phase=screen.code==='screen-end'?'Completion':screen.session?`Session ${screen.session}`:'Before the study';
      if(phase!==previousPhase){const label=document.createElement('div');label.className='phase';label.textContent=phase;$('steps').append(label);previousPhase=phase;}
      const button=document.createElement('button');button.className='step-link';button.dataset.index=index;
      const number=document.createElement('span');number.className='number';number.textContent=String(index+1).padStart(2,'0');
      const title=document.createElement('span');title.className='label';title.textContent=note(screen)[0];
      button.append(number,title);
      if(different(screen)){button.classList.add('group-difference');button.setAttribute('aria-label',note(screen)[0]+' — differs between groups');}
      button.addEventListener('click',()=>navigate(index));$('steps').append(button);
    });
  }
  function updateNotes() {
    const screen=screens()[current];if(!screen)return;
    const [title,task,purpose]=note(screen);
    $('position').textContent=`${group==='ai'?'AI GROUP':'CONTROL GROUP'} · ${current+1} / ${screens().length}`;
    $('step-title').textContent=title;
    $('task-note').textContent=task;$('purpose-note').textContent=purpose;
    let diff=different(screen)?'This step has different content for each group. Switch groups to compare.':'Both groups use the same page content in the current configuration. This is the selected group\'s actual page.';
    if(screen.code==='screen-session2-intro') diff=group==='ai'?'The AI group is told that an AI learning assistant is available and sees an introduction to it.':'The control group sees its own practice instructions, without the AI assistant introduction.';
    if(screen.code==='screen-session2-practice'){
      $('task-note').textContent=group==='ai'?'Answer in order. Use suggested questions or ask the AI assistant your own questions about the current item.':'Answer the questions independently and in order. No AI chat panel is shown.';
      diff=group==='ai'?'This group has a chat panel for each question, suggested prompts and chat history. The control group has no AI panel.':'This group has no AI panel. Switch to the AI group to compare the layout and available assistance.';
    }
    if(screen.code==='screen-session3-review') diff=group==='ai'?'In the current configuration, the AI group sees a transition message rather than the control group\'s question-by-question explanations.':'In the current configuration, the control group sees explanations for each question. The AI group sees its own transition message.';
    const hasDifference=different(screen);
    $('group-difference').hidden=!hasDifference;
    $('notes').classList.toggle('shared-step',!hasDifference);
    $('difference-title').textContent='AI vs Control';$('difference-note').textContent=hasDifference?diff:'';
    $('compare').hidden=!runs[group]?.otherScreens?.some(s=>s.code===screen.code);
    document.querySelectorAll('.step-link').forEach(b=>{b.classList.toggle('active',Number(b.dataset.index)===current);if(Number(b.dataset.index)===current)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    controls();
  }
  async function ensureRun() {
    if(!runs[group]) {
      status('Preparing the walkthrough…');
      runs[group]=normalizePaths(await api({act:'start',group:group==='ai'?1:2,competition:Number($('competition').value)}));
    }
  }
  async function navigate(index) {
    if(busy)return;
    busy=true;controls();
    try {
      // Unmount before touching this demo's storage or state.
      frame.src='about:blank';
      await ensureRun();
      current=Math.max(0,Math.min(index,screens().length-1));
      const screen=screens()[current];
      status('Loading the participant page…');
      const prepared=await api({act:'prepare',screen:screen.code},runs[group].login.token);
      const prefix=`field_static_${group}_`;
      sessionStorage.setItem(prefix+'app_token',runs[group].login.token);
      sessionStorage.setItem(prefix+'app_user_info',JSON.stringify({...prepared.user,loginTime:Date.now()}));
      sessionStorage.removeItem(prefix+'app_route_config');
      $('welcome').hidden=true;frame.hidden=false;
      const frameGroup=screen.code==='screen-login'?'login':group;
      frame.src=`view.html?group=${frameGroup}&competition=${$('competition').value}&screen=${encodeURIComponent(screen.code)}#${screen.path}`;
      renderNavigation();updateNotes();
      sessionStorage.setItem('field_static_presenter',JSON.stringify({group,current,competition:$('competition').value,runs}));
      status('');
    }catch(error){status(error.message,true);}
    finally{busy=false;controls();}
  }
  async function changeGroup(next) {
    if(busy||next===group)return;
    const code=screens()[current]?.code;
    group=next;controls();
    if($('welcome').hidden){
      // Both branches are loaded from their own targeting configuration.
      busy=true;controls();try{await ensureRun();}catch(e){status(e.message,true);busy=false;controls();return;}busy=false;
      const index=screens().findIndex(s=>s.code===code);
      await navigate(index<0?0:index);
    }
  }
  $('start-ai').onclick=()=>{group='ai';navigate(0);};
  $('start-control').onclick=()=>{group='control';navigate(0);};
  document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>changeGroup(b.dataset.group));
  $('restart').onclick=()=>{if(busy)return;delete runs.ai;delete runs.control;sessionStorage.removeItem('field_static_presenter');for(const key of Object.keys(sessionStorage))if(key.startsWith('field_static_answers_'))sessionStorage.removeItem(key);navigate(0);};
  $('previous').onclick=()=>navigate(current-1);$('next').onclick=()=>navigate(current+1);
  $('compare').onclick=()=>changeGroup(group==='ai'?'control':'ai');
  $('competition').onchange=()=>{
    if(busy)return;
    frame.src='about:blank';delete runs.ai;delete runs.control;
    navigate(0);
  };
  $('toggle-notes').onclick=()=>{
    const hidden=document.body.classList.toggle('notes-hidden');
    $('toggle-notes').textContent=hidden?'Show presenter notes':'Hide presenter notes';
  };
  addEventListener('message',event=>{
    if(event.origin!==location.origin || event.source!==frame.contentWindow || event.data?.type!=='field-demo-route' || busy)return;
    if(event.data.group!==group)return;
    const path=event.data.hash.slice(1).split('?')[0];const index=screens().findIndex(s=>s.path===path);
    if(index>=0){current=index;updateNotes();}
  });
  // Resume the same presentation without touching normal participant credentials.
  try {
    const saved=JSON.parse(sessionStorage.getItem('field_static_presenter'));
    if(saved?.runs && ['ai','control'].includes(saved.group)){
      Object.assign(runs,saved.runs);Object.values(runs).forEach(normalizePaths);group=saved.group;$('competition').value=String(saved.competition||0);navigate(Number(saved.current)||0);
    }
  }catch{/* A fresh demo is available if saved presentation data is unavailable. */}
  controls();
})();
