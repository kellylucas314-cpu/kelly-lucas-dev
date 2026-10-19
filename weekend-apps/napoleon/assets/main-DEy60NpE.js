(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(s){if(s.ep)return;s.ep=!0;const r=n(s);fetch(s.href,r)}})();const Oe=new Set,k={screen:"setup",round:1,campaign:null,clueSeconds:30,chapterOutcome:null,gameMode:"turns",gameLength:"full",players:[],activePlayer:0,answeringPlayer:0,lastCorrectPlayer:0,categories:[],finalClue:null,finalWagers:[],finalAnswers:[],currentClue:null,wagerAmount:0,buzzAttempted:[],lastJudgment:null,cluesAnswered:0,totalClues:30,timerRunning:!1,timerSeconds:30,showCategoryIntro:!1,dailyDoubleLocations:[],soundEnabled:!0};function p(){return k}function y(e){Object.assign(k,e),Rt()}function Sn(e){return Oe.add(e),()=>Oe.delete(e)}function Rt(){for(const e of Oe)e(k)}function at(){k.screen="setup",k.round=1,k.gameLength="full",k.campaign=null,k.clueSeconds=30,k.chapterOutcome=null,k.players=[],k.activePlayer=0,k.answeringPlayer=0,k.lastCorrectPlayer=0,k.categories=[],k.finalClue=null,k.finalWagers=[],k.finalAnswers=[],k.currentClue=null,k.wagerAmount=0,k.buzzAttempted=[],k.lastJudgment=null,k.cluesAnswered=0,k.totalClues=30,k.timerRunning=!1,k.timerSeconds=30,k.showCategoryIntro=!1,k.dailyDoubleLocations=[],Rt()}const Dt="jeopardy-prefs";function Te(){try{return JSON.parse(localStorage.getItem(Dt))||{}}catch{return{}}}function V(e){try{localStorage.setItem(Dt,JSON.stringify({...Te(),...e}))}catch{}}const Nt="jeopardy-records";function st(){try{return JSON.parse(localStorage.getItem(Nt))||{games:0}}catch{return{games:0}}}function In(e){if(!e||e.length===0)return;const t=e.reduce((a,s)=>s.score>a.score?s:a,e[0]),n=st();n.games=(n.games||0)+1,n.lastWinner={name:t.name,avatar:t.avatar,score:t.score},t.score>0&&(!n.best||t.score>n.best.score)&&(n.best={name:t.name,avatar:t.avatar,score:t.score});try{localStorage.setItem(Nt,JSON.stringify(n))}catch{}return n}let ye=null;async function Tn(){return ye||(ye=await(await fetch("./data/manifest.json")).json(),ye)}function re(e){return Math.floor(Math.random()*e)}function He(e){for(let t=e.length-1;t>0;t--){const n=re(t+1);[e[t],e[n]]=[e[n],e[t]]}return e}function zn(){const e=Te().pack;return e==="easy"?e:"fresh"}function R(e){return(e||"").replace(/\\"/g,'"').replace(/\\'/g,"'").trim()}const An=/\b(seen here|shown here|heard here|pictured|depicted|this song|audio clue|video clue|in this picture|in the picture|the following clip|sung here|played here|read the|this painting shown|this logo)\b/i,Bn=/\b(currently|to date|as of now|reigning|incumbent|is now called|now stars|now plays|newest|most recently)\b/i;function je(e){const t=e.clue||"";return!(An.test(t)||Bn.test(t)||t.length<8)}function Mn(e){return e.clues.length===5&&e.clues.every(je)}async function We(e,t,n){const a=`chunk-${String(n).padStart(3,"0")}.json`;return(await fetch(`./data/${e}${t}/${a}`)).json()}const Le={1:"jeopardy",2:"double",final:"final"},xn={jeopardy:[200,400,600,800,1e3],double:[400,800,1200,1600,2e3]};async function Ot(e,t){const n=await Tn();if(e==="fresh"&&n.original&&n.original[t]>0)return{pack:e,base:"original/",dir:t,total:n.original[t]};if(e==="easy"&&n.easy&&n.easy[t]>0)return{pack:e,base:"easy/",dir:t,total:n.easy[t]};throw new Error("Original question pack is unavailable")}async function Ht(e){const t=Le[e]||Le.final;return Ot(zn(),t)}const jt="jeopardy-played",qn=3e3,yt=18;function ze(){try{return JSON.parse(localStorage.getItem(jt))||{}}catch{return{}}}function rt(e){try{localStorage.setItem(jt,JSON.stringify(e))}catch{}}let wt=!1;function ot(){if(wt)return;wt=!0;const e=ze();let t=!1;for(const n of["fresh","easy","archive"]){const a=e[n];if(Array.isArray(a)){for(const s of["jeopardy","double"]){const r=`${n}:${s}`;e[r]||(e[r]=a,t=!0)}delete e[n],t=!0}}t&&rt(e)}function ct(e){return ot(),ze()[e]||[]}function _e(e){return new Set(ct(e))}function Fe(e,t){ot();const n=ze(),a=(n[e]||[]).concat(t);n[e]=a.slice(Math.max(0,a.length-qn)),rt(n)}function Wt(e,t){ot();const n=ze(),a=n[e]||[];n[e]=t>0?a.slice(Math.max(0,a.length-t)):[],rt(n)}async function $t({pack:e,base:t,dir:n,total:a},s,r){const o=`${e}:${n}`,c=_e(o),l=_e(`${e}:${n==="jeopardy"?"double":"jeopardy"}`),i=He(Array.from({length:a},(g,b)=>b)),d=Math.max(18,s*3),m=e==="archive"?Math.min(a,40):a,f=[],v=[];for(let g=0;g<m&&(f.length<d||g<3);g++){const b=await We(t,n,i[g]);for(const $ of b)!Mn($)||r.has($.name)||(c.has($.name)?v.push($):l.has($.name)||f.push($))}if(f.length<s){const g=new Set(ct(o).slice(-yt));Wt(o,yt);for(const b of v){if(f.length>=d)break;g.has(b.name)||f.push(b)}if(f.length<s)for(const b of v){if(f.length>=s)break;g.has(b.name)&&f.push(b)}}He(f);const h=f.slice(0,s);for(const g of h)r.add(g.name);return Fe(o,h.map(g=>g.name)),h}function Pn(e,t){return{name:R(e.name),clues:e.clues.map((n,a)=>({clue:R(n.clue),response:R(n.response),value:t?t[a]:n.value,answered:!1,isDailyDouble:!1}))}}async function kt(e,t=new Set,n={}){const a=Le[e]||Le[1],s=xn[a],r=n.count||6,o=[];if(Array.isArray(n.recipe)&&n.recipe.length)for(const c of n.recipe){if(!c.count)continue;const l=await Ot(c.pack,c.dir);o.push(...await $t(l,c.count,t))}if(o.length<r){const c=await Ht(e);o.push(...await $t(c,r-o.length,t))}return He(o.slice(0,r)).map(c=>Pn(c,s))}async function Rn(e=new Set){const{pack:t,base:n,dir:a,total:s}=await Ht("final"),r=`${t}-final`,o=_e(r);for(let m=0;m<8;m++){const f=re(s),h=(await We(n,a,f)).filter(g=>je(g)&&!e.has(g.name)&&!o.has(g.name));if(h.length){const g=h[re(h.length)];return e.add(g.name),Fe(r,[g.name]),{name:R(g.name),clue:R(g.clue),response:R(g.response)}}}const c=new Set(ct(r).slice(-8));Wt(r,8);const l=await We(n,a,re(s)),i=l.filter(m=>je(m)&&!e.has(m.name)&&!c.has(m.name)),d=(i.length?i:l)[re(i.length?i.length:l.length)];return e.add(d.name),Fe(r,[d.name]),{name:R(d.name),clue:R(d.clue),response:R(d.response)}}const _t=new Set(["a","an","the","his","her","hers","their","its","your","my","our","of","and","or","to","in","on","at","for","with","de","la","le","el","los","las","von","van"]),Dn=/^(a|an|the|his|her|their|its|your|my|our)\s+/,Nn=/^(what|who|where|when|why|how)(?:'s|s)?\s+(is|are|was|were|did|do|does|it'?s)\s+/;function Ft(e){return e.normalize("NFD").replace(/[̀-ͯ]/g,"")}function Ge(e){let t=Ft(String(e).toLowerCase()).trim();t=t.replace(Nn,""),t=t.replace(/[^a-z0-9\s]/g," "),t=t.replace(/\s+/g," ").trim();let n;do n=t,t=t.replace(Dn,"");while(t!==n);return t.trim()}function Ke(e){return e?e.split(" ").filter(Boolean):[]}function Ue(e){return e.length>=4&&!_t.has(e)}function On(e){const t=Ft(String(e).toLowerCase()),n=t.replace(/[()]/g," "),a=t.replace(/\([^)]*\)/g," "),s=new Set;for(const o of[n,a]){const c=o.split(/\s*(?:\/|,|;|&|\bor\b|\band\b)\s*/);for(const l of c){const i=Ge(l);if(!i)continue;s.add(i);const d=Ke(i);if(d.length>1){const m=d[d.length-1];Ue(m)&&s.add(m)}}}const r=Ge(t.replace(/[()]/g," "));return r&&s.add(r),[...s].filter(Boolean)}function Gt(e,t){const n=e.length,a=t.length;if(n===0)return a;if(a===0)return n;let s=Array.from({length:a+1},(o,c)=>c),r=new Array(a+1);for(let o=1;o<=n;o++){r[0]=o;for(let c=1;c<=a;c++)r[c]=e[o-1]===t[c-1]?s[c-1]:1+Math.min(s[c],r[c-1],s[c-1]);[s,r]=[r,s]}return s[a]}function Hn(e,t){const n=Math.max(e.length,t.length);return n===0?0:1-Gt(e,t)/n}function Pe(e,t){if(e===t)return!0;const n=Gt(e,t);return e.length<=5||t.length<=5?n<=1:n<=2}function Kt(e,t){const n=Ge(e);if(!n)return{correct:!1,similarity:0};const a=Ke(n),s=a.filter(Ue),r=a.some(l=>l.length>=3&&!_t.has(l)),o=On(t);let c=0;for(const l of o){if(!l)continue;if(n===l)return{correct:!0,similarity:1};const i=Hn(n,l);c=Math.max(c,i);const d=Math.max(l.length,n.length)<=6?.78:.72;if(i>=d)return{correct:!0,similarity:i};const m=Ke(l);if(a.length&&m.length&&r){const f=a.every(h=>m.some(g=>Pe(h,g))),v=m.every(h=>a.some(g=>Pe(g,h)));if(f||v)return{correct:!0,similarity:.9}}if(s.length<=1){const f=m.filter(Ue);for(const v of s)for(const h of f)if(Pe(v,h))return{correct:!0,similarity:.85}}}return{correct:!1,similarity:c}}let Re=null,x=!0;function jn(){return Re||(Re=new(window.AudioContext||window.webkitAudioContext)),Re}function Ut(){const e=jn();return e.state==="suspended"&&e.resume(),e}function Je(e){x=e}function oe(){return x}let G=null;function Wn(){const e=Ut();return G||(G=e.createBiquadFilter(),G.type="lowpass",G.frequency.value=4200,G.Q.value=.4,G.connect(e.destination)),G}function I(e,t,n="sine",a=.3,s=0){if(!x)return;const r=Ut(),o=r.currentTime+s,c=r.createOscillator(),l=r.createGain();c.type=n,c.frequency.setValueAtTime(e,o);const i=Math.min(.02,t*.25);l.gain.setValueAtTime(1e-4,o),l.gain.exponentialRampToValueAtTime(a,o+i),l.gain.exponentialRampToValueAtTime(1e-4,o+t),c.connect(l),l.connect(Wn()),c.start(o),c.stop(o+t+.02)}function Q(e,t,n=.2,a=0){I(e,t,"triangle",n,a),I(e*2.001,t*.8,"sine",n*.35,a)}function Ae(){if(!x)return;[523.25,659.25,783.99,1046.5].forEach((t,n)=>Q(t,.42,.16,n*.13))}function Jt(){I(587.33,.09,"sine",.12)}function lt(){x&&(Q(523.25,.16,.18,0),Q(659.25,.16,.18,.1),Q(783.99,.34,.2,.2))}function _n(){x&&(I(311.13,.22,"sine",.16,0),I(233.08,.34,"sine",.16,.16))}function Fn(){if(!x)return;[440,554.37,659.25,880,659.25,554.37,440,554.37,659.25,880].forEach((t,n)=>I(t,.14,"triangle",.16,n*.08))}function Gn(){I(880,.045,"sine",.07)}function Kn(){x&&(I(783.99,.07,"triangle",.16,0),I(1174.66,.13,"triangle",.16,.06))}function Un(){I(130.81,.16,"sine",.14)}function Jn(){x&&(I(659.25,.08,"triangle",.14,0),I(987.77,.14,"triangle",.14,.07))}function Yn(){I(698.46,.13,"triangle",.1)}function Vn(){x&&(Q(659.25,.14,.14,0),Q(987.77,.24,.16,.11))}function Yt(){x&&(I(196,.5,"triangle",.16,0),I(164.81,.5,"sine",.12,0))}let $e=null;function Qn(){if(!x)return;const e=[392,440,392,330,392,440,392,0,392,440,392,440,523,494,440,0,392,440,392,330,392,440,392,0,330,349,330,294,262,294,330,0];let t=0;$e=setInterval(()=>{e[t]>0&&I(e[t],.35,"triangle",.12),t=(t+1)%e.length},400)}function Ce(){$e&&(clearInterval($e),$e=null)}function Vt(){if(!x)return;[262,330,392,523,659,784,1047].forEach((t,n)=>{setTimeout(()=>I(t,.4,"triangle",.15),n*100)})}let z=null;async function Qt(){return z||(z=await(await fetch("./data/campaign/chapters.json")).json(),z)}function it(){return z?z.chapters.length:15}function Z(e){return z&&z.chapters[Math.max(0,Math.min(z.chapters.length,e)-1)]||null}const Zt="jeopardy-campaign";function Be(){try{const e=JSON.parse(localStorage.getItem(Zt))||{};return{current:Math.max(1,e.current||1),completed:Array.isArray(e.completed)?e.completed:[],attempts:e.attempts&&typeof e.attempts=="object"?e.attempts:{},finishedAt:e.finishedAt||null}}catch{return{current:1,completed:[],attempts:{},finishedAt:null}}}function Xt(e){try{localStorage.setItem(Zt,JSON.stringify(e))}catch{}}function Zn(){Xt({current:1,completed:[],attempts:{},finishedAt:null})}function Xn(e,t,n){const a=Be(),s=t.reduce((f,v)=>v.score>f.score?v:f,t[0]),r=Me(e,n,a),o=s.score>=r,c=it(),l=e.number;a.attempts[l]=(a.attempts[l]||0)+1;let i=!1;o&&(a.completed=a.completed.filter(f=>f.number!==l),a.completed.push({number:l,score:s.score,leader:s.name,at:Date.now()}),l>=a.current&&(l>=c?(i=!0,a.finishedAt=a.finishedAt||Date.now(),a.current=c):a.current=l+1)),Xt(a);const d=o?ca(e):[],m=o&&!i?Z(l+1):null;return{won:o,target:r,topScore:s.score,leader:s.name,gained:d,next:m,campaignComplete:i,attempts:a.attempts[l]}}const ea=[2500,4e3,5500,7e3,9e3],ta=[1200,2e3,2800,3600,4500];function Me(e,t="full",n=Be()){const a=t==="quick"?ta:ea,s=n.attempts&&n.attempts[e.number]||0,r=Math.max(0,Math.min(4,e.tier-1)-Math.floor(s/2));return a[r]}function dt(e){return[35,32,30,26,22][Math.max(0,Math.min(4,e.tier-1))]}function na(e,t,n="fresh"){const a=Math.max(1,Math.min(5,e.tier)),s=t===2,r=(l,i)=>({pack:"easy",dir:l,count:i}),o=(l,i)=>({pack:"fresh",dir:l,count:i});return n==="easy"?{1:s?[r("double",5)]:[r("jeopardy",5)],2:s?[r("double",5)]:[r("jeopardy",5)],3:s?[r("double",4),o("jeopardy",1)]:[r("jeopardy",4),o("jeopardy",1)],4:s?[r("double",3),o("jeopardy",2)]:[r("jeopardy",3),o("jeopardy",2)],5:s?[r("double",2),o("jeopardy",3)]:[r("jeopardy",3),o("jeopardy",2)]}[a]:{1:s?[r("double",2),o("jeopardy",3)]:[r("jeopardy",3),o("jeopardy",2)],2:s?[o("jeopardy",3),o("double",2)]:[r("jeopardy",1),o("jeopardy",4)],3:s?[o("double",5)]:[o("jeopardy",5)],4:s?[o("double",5)]:[o("jeopardy",3),o("double",2)],5:s?[o("double",5)]:[o("jeopardy",1),o("double",4)]}[a]}function en(e){return["Skirmish","Engagement","Battle","Grand Battle","Decisive"][Math.max(0,Math.min(4,e-1))]}const aa=[200,400,600,800,1e3],sa=[400,800,1200,1600,2e3];function ra(e,t,n="full"){const a=n==="quick"||t===2?e.chapter:e.era,s=t===2?sa:aa;return{name:a.name,themed:!0,clues:a.clues.map((r,o)=>({clue:r.clue,response:r.response,value:s[o],answered:!1,isDailyDouble:!1}))}}function oa(e){return{name:e.final.name,clue:e.final.clue,response:e.final.response}}function me(e){return(e.empire.holdings||[]).filter(t=>t.status!=="lost"&&t.status!=="exile")}function ca(e){const t=Z(e.number-1),n=new Set(t?me(t).map(a=>a.name):[]);return me(e).filter(a=>!n.has(a.name)).map(a=>a.name)}function la(e){return(e.empire.holdings||[]).filter(t=>t.status==="lost").map(t=>t.name)}function ia(){return z?Math.max(1,...z.chapters.map(e=>me(e).length)):1}function da(e){return z&&z.statusLabels&&z.statusLabels[e]||e}let ce=new Set;const ua=500,ut=3;function ma(e,t){return{name:e,avatar:t,score:0,correct:0,wrong:0,streak:0,bestStreak:0,chapterCorrect:0,decorated:!1}}function tn(e){return e>=3?e*100:0}async function Et(e,t="turns",n=[],a="full",s=null){if(ce=new Set,y({players:e.map((r,o)=>ma(r,n[o]||String(o+1))),gameMode:e.length>1?t:"turns",gameLength:a,campaign:s&&s.chapter?{chapter:s.chapter,basePack:s.basePack||"fresh"}:null,clueSeconds:s&&s.chapter?dt(s.chapter):30,chapterOutcome:null,activePlayer:0,answeringPlayer:0,lastCorrectPlayer:0,round:1,cluesAnswered:0,screen:"loading"}),s&&s.chapter){y({screen:"chapter-intro"});return}await he(1)}async function Lt(){y({screen:"loading"}),await he(1)}async function he(e){const{campaign:t,gameLength:n}=p();let a;try{if(t){const r=ra(t.chapter,e,n);ce.add(r.name);const o=na(t.chapter,e,t.basePack);a=(await kt(e,ce,{recipe:o,count:5})).slice(0,5),a.splice(Math.floor(Math.random()*(a.length+1)),0,r)}else a=await kt(e,ce)}catch{y({screen:"error",errorContext:"round"});return}if(!a||a.length<6){y({screen:"error",errorContext:"round"});return}const s=pa(a,e);for(const r of s)a[r.catIndex].clues[r.clueIndex].isDailyDouble=!0;y({round:e,categories:a,dailyDoubleLocations:s,cluesAnswered:0,totalClues:30,showCategoryIntro:!0,screen:"board"}),Ae()}function pa(e,t){const n=t===1?1:2,a=[],s=new Set;for(;a.length<n;){const r=Math.floor(Math.random()*6),o=[1,2,4,6,8],c=o.reduce((m,f)=>m+f,0);let l=Math.random()*c,i=0;for(let m=0;m<o.length;m++)if(l-=o[m],l<=0){i=m;break}const d=`${r}-${i}`;s.has(d)||(s.add(d),a.push({catIndex:r,clueIndex:i}))}return a}async function fa(){const{errorContext:e,round:t}=p();if(y({screen:"loading"}),e==="final"){await sn();return}await he(t===3?1:t)}async function ha(){const{cluesAnswered:e,round:t}=p();e>0||(y({screen:"loading"}),await he(t))}function ga(e,t){const{categories:n,players:a,activePlayer:s}=p(),r=n[e],o=r.clues[t];if(o.answered)return;const c={catIndex:e,clueIndex:t,clue:o.clue,response:o.response,value:o.value,isDailyDouble:o.isDailyDouble,categoryName:r.name,themed:!!r.themed};y({currentClue:c,answeringPlayer:s,buzzAttempted:a.map(()=>!1),lastJudgment:null}),o.isDailyDouble?(Fn(),y({screen:"daily-double"})):(Jt(),y({screen:"clue",timerSeconds:p().clueSeconds,timerRunning:!0}))}function ba(e){y({wagerAmount:e,screen:"clue",timerSeconds:p().clueSeconds,timerRunning:!0})}function nn(e,t){if(!t.themed)return{bonus:0,fields:{}};const n=(e.chapterCorrect||0)+1,a=!e.decorated&&n>=ut;return{bonus:a?ua:0,fields:{chapterCorrect:n,decorated:e.decorated||a}}}function va(e){y({answeringPlayer:e}),Kn()}function ge(){const{categories:e,currentClue:t,cluesAnswered:n}=p(),a=e.map((s,r)=>r===t.catIndex?{...s,clues:s.clues.map((o,c)=>c===t.clueIndex?{...o,answered:!0}:o)}:s);y({categories:a,cluesAnswered:n+1})}function an(e){const{currentClue:t,players:n,answeringPlayer:a,gameMode:s,buzzAttempted:r,wagerAmount:o}=p();if(!t)return null;y({timerRunning:!1});const c=Kt(e,t.response),l=t.isDailyDouble?o:t.value,i=[...n],d=i[a];let m=0,f=0,v=0;if(c.correct){f=d.streak+1,m=tn(f);const $=nn(d,t);v=$.bonus,i[a]={...d,...$.fields,score:d.score+l+m+v,correct:d.correct+1,streak:f,bestStreak:Math.max(d.bestStreak,f)},lt()}else i[a]={...d,score:d.score-l,wrong:d.wrong+1,streak:0},_n();const h=[...r];h[a]=!0;const g=h.filter($=>!$).length,b=!c.correct&&s==="buzz"&&!t.isDailyDouble&&g>0;return y({players:i,buzzAttempted:h,lastJudgment:{playerIndex:a,value:l,correct:c.correct},lastCorrectPlayer:c.correct?a:p().lastCorrectPlayer}),b||ge(),{correct:c.correct,correctResponse:t.response,value:l,bonus:m,legion:v,streak:f,canRebuzz:b,remaining:g}}function ya(){const{lastJudgment:e,players:t,currentClue:n,gameMode:a,buzzAttempted:s,cluesAnswered:r}=p();if(!e||e.correct)return null;const{playerIndex:o,value:c}=e,l=[...t],i=l[o],d=i.streak+1,m=tn(d),f=nn(i,n||{}),v=f.bonus;return l[o]={...i,...f.fields,score:i.score+c*2+m+v,correct:i.correct+1,wrong:Math.max(0,i.wrong-1),streak:d,bestStreak:Math.max(i.bestStreak,d)},y({players:l,lastCorrectPlayer:o,lastJudgment:{...e,correct:!0}}),a==="buzz"&&n&&!n.isDailyDouble&&s.some(g=>!g)&&ge(),lt(),{value:c,bonus:m,legion:v,streak:d}}function wa(){const{currentClue:e}=p();return e?(y({timerRunning:!1}),Yt(),ge(),{correctResponse:e.response}):null}function mt(){const{cluesAnswered:e,totalClues:t,round:n,players:a,lastCorrectPlayer:s,gameLength:r}=p(),o=a.length>1?s:0;e>=t?n===1&&r!=="quick"?y({currentClue:null,screen:"round-transition"}):(y({currentClue:null,screen:"loading"}),sn()):y({currentClue:null,wagerAmount:0,activePlayer:o,screen:"board"})}function $a(){const{currentClue:e,players:t,answeringPlayer:n,wagerAmount:a}=p();if(!e)return;y({timerRunning:!1}),Yt();const s=e.isDailyDouble?a:e.value,r=[...t],o=r[n];return r[n]={...o,score:o.score-s,wrong:o.wrong+1,streak:0},y({players:r,lastJudgment:null}),ge(),{correctResponse:e.response,value:s}}function ka(){const{currentClue:e}=p();if(e)return y({timerRunning:!1,lastJudgment:null}),ge(),{correctResponse:e.response}}async function Ea(){const{players:e}=p(),t={screen:"loading"};if(e.length>1){const n=e.reduce((a,s,r,o)=>s.score<o[a].score?r:a,0);t.activePlayer=n,t.lastCorrectPlayer=n}y(t),Vt(),await he(2)}async function sn(){const{campaign:e}=p();let t;try{t=e?oa(e.chapter):await Rn(ce)}catch{y({screen:"error",errorContext:"final"});return}if(!t){y({screen:"error",errorContext:"final"});return}y({round:3,finalClue:t,finalWagers:p().players.map(()=>0),finalAnswers:p().players.map(()=>({answer:"",correct:!1})),screen:"final-category"}),Ae()}function Ct(e){y({finalWagers:e,screen:"final-clue"}),Qn()}function St(e){Ce();const{finalClue:t,finalWagers:n,players:a}=p(),s=e.map(o=>{const c=Kt(o,t.response);return{answer:o,correct:c.correct}}),r=a.map((o,c)=>({...o,score:o.score+(s[c].correct?n[c]:-n[c]),correct:o.correct+(s[c].correct?1:0),wrong:o.wrong+(s[c].correct?0:n[c]>0||e[c]?1:0)}));return y({finalAnswers:s,players:r,screen:"final-answer"}),s}function La(e){const{finalAnswers:t,finalWagers:n,players:a}=p(),s=t[e],r=n[e],o=!s.correct,c=(o?1:-1)*r*2,l=[...a];l[e]={...l[e],score:l[e].score+c};const i=[...t];i[e]={...s,correct:o},y({players:l,finalAnswers:i}),o&&lt()}function Ca(){const{campaign:e,players:t,gameLength:n,chapterOutcome:a}=p(),s={screen:"results"};e&&!a&&(s.chapterOutcome=Xn(e.chapter,t,n)),y(s)}const T=document.getElementById("app");let K=null,O=null,U=!1;const Sa=window.matchMedia("(prefers-reduced-motion: reduce)"),be=()=>Sa.matches;let pt=!1;window.addEventListener("keydown",e=>{["Tab","Enter"," ","Spacebar","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)&&(pt=!0)},!0);window.addEventListener("pointerdown",()=>{pt=!1},!0);const De=document.getElementById("screen-announcer");function j(e){!De||!e||(De.textContent="",setTimeout(()=>{De.textContent=e},60))}function q(e){e&&(e.focus({preventScroll:!0}),e.classList.add("kb-focus"),e.addEventListener("blur",()=>e.classList.remove("kb-focus"),{once:!0}))}const M=["var(--p0)","var(--p1)","var(--p2)"],Ia={check:"check",cross:"x",clock:"clock"};function H(e,t=""){return`<i class="ph ph-${Ia[e]} icon ${t}" aria-hidden="true"></i>`}const It=["I","II","III"];function J(e,t=0){const n=(e||"").trim();if(!n||/^Player\s*\d*$/i.test(n))return It[t]||String(t+1);const a=n.match(/[\p{L}\p{N}]/u);return a?a[0].toUpperCase():It[t]||String(t+1)}let X=[],ee=null;const rn=["The Emperor accepts this answer.","A triumph worthy of the Grande Armée.","Précisément. Take the spoils.","History favors the prepared.","A conquest, cleanly executed.","The Emperor is… impressed.","Vive la victoire!"],on=["A tactical retreat.","The Emperor regrets to decline.","Not even my cavalry could save that one.","Bold. Doomed, but bold.","We shall not speak of this again.","Every campaign has its setbacks."],cn=["Time waits for no emperor.","The clock has outflanked you.","Hesitation — the one enemy I never forgave."],Ta=["No volunteers? Cowardice.","The salon falls silent…","Even my old guard would not charge at this one.","Very well. The board keeps its secret."],za=["The spoils lie unclaimed!","An open flank — who will take it?","Seize it, or regret it."],ln=["Choose your battlefield.","The board awaits your command.","Pick your ground — history is watching.","Retreat is unavailable. Pick a category.","Every square hides a small war."];let L=null,ft=ln[0];const D=e=>e[Math.floor(Math.random()*e.length)],Se=["q","p","b"];let A=null,Ye=[],Ve=[],le=null;function dn(){const e=p();if(!(e.screen===O&&e.screen==="clue"))switch(O=e.screen,e.screen!=="clue"&&mn(),e.screen!=="results"&&document.querySelectorAll(".confetti-container").forEach(t=>t.remove()),e.screen!=="board"&&Xe(),e.screen){case"setup":Ba();break;case"loading":xa();break;case"chapter-intro":qa();break;case"error":Ra();break;case"board":Da();break;case"clue":Wa();break;case"daily-double":Va();break;case"round-transition":Qa();break;case"final-category":Za();break;case"final-wager":Xa();break;case"final-clue":es();break;case"final-answer":ts();break;case"results":as();break}}Sn(dn);function ht(e,t){clearInterval(K);let n=e;Tt(n,e),K=setInterval(()=>{n--,n<=5&&n>0&&Gn(),n===5&&j("5 seconds left."),Tt(n,e),n<=0&&(clearInterval(K),t())},1e3)}function Tt(e,t){const n=e<=5,a=document.getElementById("timer-bar");a&&(a.style.setProperty("--fill",Math.max(0,e)/t),a.classList.toggle("urgent",n));const s=document.getElementById("timer-text");s&&(s.textContent=e,s.classList.toggle("urgent",n))}function un(){clearInterval(K),y({timerRunning:!1})}function mn(){clearInterval(K);for(const e of Ve)clearTimeout(e);Ve=[],A=null,le&&(window.removeEventListener("keydown",le),le=null),Qe()}let ke=null,_=null;function ae(e){Qe();const t=()=>{Qe(),O=null,mt()};ke=setTimeout(t,e),_=n=>{n.type==="keydown"&&!["Enter"," ","Spacebar"].includes(n.key)||n.target&&n.target.closest&&n.target.closest("button")||t()},setTimeout(()=>{if(!_)return;document.addEventListener("click",_),window.addEventListener("keydown",_);const n=document.getElementById("clue-feedback");if(n&&n.classList.contains("show")&&!n.querySelector(".tap-hint")&&!n.querySelector(".feedback-actions")){const a=document.createElement("div");a.className="tap-hint",a.textContent="Tap anywhere, or press Space or Enter, to continue",n.appendChild(a)}},350)}function Qe(){ke&&(clearTimeout(ke),ke=null),_&&(document.removeEventListener("click",_),window.removeEventListener("keydown",_),_=null)}function Aa(){const e=$a();if(!e)return;const t=D(cn);N(`
    <div class="feedback-wrong">
      <div class="feedback-icon">${H("clock")}</div>
      <div class="feedback-verdict">Time&rsquo;s up</div>
      <div class="feedback-line">${t}</div>
      <div class="feedback-delta">&minus;$${E(e.value)} &middot; ${pe()}</div>
      <div class="correct-response">The correct response: <strong>${u(e.correctResponse)}</strong></div>
    </div>
  `),fe(!1,t,-e.value,e.correctResponse),ae(3e3)}function Ba(){const e=Te(),t=e.names||[],n=e.avatars||[],a=e.playerCount||2,s=e.gameMode||"turns",r=e.gameLength||"full",o=e.pack==="easy"?e.pack:"fresh",c=e.playStyle==="campaign"?"campaign":"free";typeof e.sound=="boolean"&&Je(e.sound),ee=null,X=[],nt=!1;const l=st(),i=l.lastWinner?`
    <div class="hall-of-fame">
      <span class="hof-item">Last win: <strong>${u(l.lastWinner.name)}</strong> · ${B(l.lastWinner.score)}</span>
      ${l.best?`<span class="hof-item">Best: <strong>${u(l.best.name)}</strong> · ${B(l.best.score)}</span>`:""}
    </div>`:"";T.innerHTML=`
    <div class="setup-screen">
      <section class="setup-hero" aria-labelledby="game-title">
        <div class="setup-brand">
          <div class="eyebrow">A trivia coup hosted by Napoleon</div>
          <h1 class="logo" id="game-title">Clue d&rsquo;&Eacute;tat</h1>
          <p class="setup-deck">History is watching. Choose your battlefield and seize the board.</p>
        </div>
        <figure class="title-scene">
          <img class="title-map" src="./assets/napoleon-map-hero.png"
               width="1536" height="1024" fetchpriority="high"
               alt="Low-poly Napoleon emerging from an open, folded map of Europe">
          <figcaption class="title-scene-caption">The Emperor awaits</figcaption>
        </figure>
        ${i}
      </section>
      <section class="setup-panel">
        <div class="setup-panel-heading">
          <span class="setup-panel-kicker">Prepare the table</span>
          <h2>Begin a campaign</h2>
        </div>
        <div class="setup-card">
          <h2>How many players?</h2>
          <div class="player-count-buttons">
            ${[1,2,3].map(d=>`
              <button class="btn-player-count ${d===a?"selected":""}" data-count="${d}">
                ${d} Player${d>1?"s":""}
              </button>
            `).join("")}
          </div>
          <div id="player-names"></div>
          <h2 class="mode-title">Play style</h2>
          <div class="mode-buttons style-buttons">
            <button class="btn-mode btn-style ${c==="free"?"selected":""}" data-style="free">
              <span class="mode-name">Free Play</span>
              <span class="mode-desc">A fresh board every night, from the pack you choose</span>
            </button>
            <button class="btn-mode btn-style ${c==="campaign"?"selected":""}" data-style="campaign">
              <span class="mode-name">The Campaign</span>
              <span class="mode-desc">Napoleon's life in 15 chapters. Win a chapter and the Empire grows</span>
            </button>
          </div>
          <div id="chapter-card" class="chapter-card" ${c==="campaign"?"":"hidden"}></div>
          <h2 class="mode-title">Game length</h2>
          <div class="player-count-buttons length-buttons">
            <button class="btn-player-count btn-length ${r==="quick"?"selected":""}" data-length="quick">
              Quick &middot; ~20 min
            </button>
            <button class="btn-player-count btn-length ${r==="full"?"selected":""}" data-length="full">
              Full &middot; ~45 min
            </button>
          </div>
          <h2 class="mode-title">Questions</h2>
          <div class="mode-buttons pack-buttons">
            <button class="btn-mode btn-pack ${o==="fresh"?"selected":""}" data-pack="fresh">
              <span class="mode-name">Fresh Pack</span>
              <span class="mode-desc">4,900+ original clues written for this game</span>
            </button>
            <button class="btn-mode btn-pack ${o==="easy"?"selected":""}" data-pack="easy">
              <span class="mode-name">Easy Breezy</span>
              <span class="mode-desc">Gentler questions, classics &amp; nostalgia</span>
            </button>
          </div>
          <div id="mode-section">
            <h2 class="mode-title">Game mode</h2>
            <div class="mode-buttons">
              <button class="btn-mode ${s==="turns"?"selected":""}" data-mode="turns">
                <span class="mode-name">Take Turns</span>
                <span class="mode-desc">Pass the keyboard, answer one at a time</span>
              </button>
              <button class="btn-mode ${s==="buzz"?"selected":""}" data-mode="buzz">
                <span class="mode-name">Buzz In!</span>
                <span class="mode-desc">Race to the buzzer, salon-style</span>
              </button>
            </div>
          </div>
          <button class="btn-start" id="btn-start-game">${c==="campaign"?"March on":"Open the Board"}</button>
        </div>
        <div class="setup-footer">
          <label class="sound-toggle">
            <input type="checkbox" id="sound-checkbox" ${oe()?"checked":""}>
            <span>Sound Effects</span>
          </label>
          <button class="link-btn" id="btn-how-to">How to play</button>
          <a class="link-btn" href="https://kellylucas.dev/army.html">The Army</a>
        </div>
      </section>
    </div>
  `,Bt(a,t,n),At(a),document.querySelectorAll(".btn-player-count:not(.btn-length)").forEach(d=>{d.addEventListener("click",()=>{document.querySelectorAll(".btn-player-count:not(.btn-length)").forEach(f=>f.classList.remove("selected")),d.classList.add("selected");const m=parseInt(d.dataset.count);Bt(m,t,n),At(m)})}),document.querySelectorAll(".btn-length").forEach(d=>{d.addEventListener("click",()=>{document.querySelectorAll(".btn-length").forEach(m=>m.classList.remove("selected")),d.classList.add("selected"),ie()})}),document.querySelectorAll(".btn-style").forEach(d=>{d.addEventListener("click",()=>{document.querySelectorAll(".btn-style").forEach(h=>h.classList.remove("selected")),d.classList.add("selected");const m=d.dataset.style;V({playStyle:m});const f=document.getElementById("chapter-card");f&&(f.hidden=m!=="campaign");const v=document.getElementById("btn-start-game");v&&m!=="campaign"&&(v.textContent="Open the Board"),ie()})}),ie(),document.querySelectorAll(".btn-mode:not(.btn-pack)").forEach(d=>{d.addEventListener("click",()=>{document.querySelectorAll(".btn-mode:not(.btn-pack)").forEach(m=>m.classList.remove("selected")),d.classList.add("selected")})}),document.querySelectorAll(".btn-pack").forEach(d=>{d.addEventListener("click",()=>{document.querySelectorAll(".btn-pack").forEach(m=>m.classList.remove("selected")),d.classList.add("selected"),V({pack:d.dataset.pack})})}),document.getElementById("sound-checkbox").addEventListener("change",d=>{Je(d.target.checked),V({sound:d.target.checked})}),document.getElementById("btn-how-to").addEventListener("click",ve),document.getElementById("btn-start-game").addEventListener("click",()=>{var $,P,w,S;const d=document.querySelectorAll(".player-name-input"),m=Array.from(d).map((F,qe)=>F.value.trim()||`Player ${qe+1}`),f=m.map((F,qe)=>J(F,qe)),v=(($=document.querySelector(".btn-mode.selected:not(.btn-pack)"))==null?void 0:$.dataset.mode)||"turns",h=((P=document.querySelector(".btn-length.selected"))==null?void 0:P.dataset.length)||"full",g=((w=document.querySelector(".btn-pack.selected"))==null?void 0:w.dataset.pack)||"fresh",b=((S=document.querySelector(".btn-style.selected"))==null?void 0:S.dataset.style)||"free";if(V({names:m,avatars:f,playerCount:m.length,gameMode:v,gameLength:h,pack:g,playStyle:b,sound:oe()}),Jt(),b==="campaign"){const F=pn();Qt().then(()=>{Et(m,v,f,h,{chapter:Z(F),basePack:g})}).catch(()=>y({screen:"error",errorContext:"campaign"}))}else Et(m,v,f,h)})}function pn(){var a;const e=Be(),t=document.getElementById("chapter-card"),n=Number(((a=document.getElementById("chapter-select"))==null?void 0:a.value)||(t==null?void 0:t.dataset.selected)||0);return n>=1&&n<=e.current?n:e.current}async function ie(){var v,h,g;const e=document.getElementById("chapter-card");if(!e||e.hidden)return;e.innerHTML||(e.innerHTML='<div class="chapter-loading">Unrolling the map&hellip;</div>');try{await Qt()}catch{e.innerHTML='<div class="chapter-loading">Couldn&rsquo;t load the Campaign. Check your connection.</div>';return}if(!document.getElementById("chapter-card"))return;const t=Be(),n=it(),a=pn(),s=Z(a),r=((v=document.querySelector(".btn-length.selected"))==null?void 0:v.dataset.length)||"full",o=Me(s,r,t),c=t.completed.length,l=Array.from({length:t.current},(b,$)=>$+1),i=l.map(b=>{const $=Z(b),P=t.completed.some(w=>w.number===b);return`<option value="${b}" ${b===a?"selected":""}>Chapter ${b} · ${u($.title)}${P?" ✓":""}</option>`}).join(""),d=t.attempts[a]||0,m=Z(Math.max(1,...t.completed.map(b=>b.number)));e.dataset.selected=String(a),e.innerHTML=`
    <div class="chapter-kicker">Chapter ${s.number} of ${n} &middot; ${u(s.years)}</div>
    <div class="chapter-title">${u(s.title)}</div>
    <div class="chapter-stage">${u(s.stage)}</div>
    <div class="chapter-facts">
      <span>${en(s.tier)} &middot; tier ${s.tier} of 5</span>
      <span>Target ${B(o)}</span>
      <span>${dt(s)}s per clue</span>
      ${d?`<span>${d} attempt${d>1?"s":""} so far</span>`:""}
    </div>
    <div class="chapter-empire">${u(s.empire.headline)} &middot; ${me(s).length} holdings on the ledger</div>
    ${l.length>1?`<label class="chapter-pick">Play chapter <select id="chapter-select">${i}</select></label>`:""}
    <div class="chapter-links">
      <button class="link-btn" id="btn-empire">The Empire so far</button>
      ${c?`<span class="chapter-progress">${Math.min(c,n)} of ${n} chapters won</span>`:""}
      ${c||Object.keys(t.attempts).length?'<button class="link-btn" id="btn-campaign-reset">Start over</button>':""}
    </div>
  `;const f=document.getElementById("btn-start-game");f&&(f.textContent=`March on Chapter ${s.number}`),(h=document.getElementById("chapter-select"))==null||h.addEventListener("change",b=>{e.dataset.selected=b.target.value,ie()}),document.getElementById("btn-empire").addEventListener("click",()=>gt(m)),(g=document.getElementById("btn-campaign-reset"))==null||g.addEventListener("click",Ma)}function Ma(){const e=se(`
    <div class="modal">
      <div class="modal-title">Start the Campaign over?</div>
      <div class="modal-body">Every chapter is locked again and the Empire shrinks back to the Kingdom of France. Your Hall of Fame is untouched.</div>
      <div class="modal-actions">
        <button class="btn-quiet modal-cancel">Keep my progress</button>
        <button class="btn-danger modal-confirm">Start over</button>
      </div>
    </div>
  `,{label:"Start the Campaign over"});e&&e.overlay.querySelector(".modal-confirm").addEventListener("click",()=>{Zn(),e.close();const t=document.getElementById("chapter-card");t&&(delete t.dataset.selected,ie())})}const zt=["core","annexed","satellite","allied","occupied","lost","exile"];function gt(e){if(!e)return;const t=e.empire,n=[...t.holdings].sort((o,c)=>zt.indexOf(o.status)-zt.indexOf(c.status)),a=me(e).length,s=ia(),r=[`${a} holding${a===1?"":"s"}`,`zenith ${s}`,t.departements?`${t.departements} départements`:"",t.peopleMillions?`about ${t.peopleMillions} million people`:""].filter(Boolean).join(" · ");se(`
    <div class="modal empire">
      <div class="modal-title">The Empire &middot; Chapter ${e.number} &middot; ${u(e.years)}</div>
      <div class="empire-headline">${u(t.headline)}</div>
      <div class="empire-note">${u(t.note||"")}</div>
      <div class="empire-bar" role="img" aria-label="Empire size ${a} of ${s}"><div class="empire-bar-fill" style="--fill:${a/s}"></div></div>
      <div class="empire-meta">${u(r)}</div>
      <ul class="empire-list">
        ${n.map(o=>`
          <li class="status-${o.status}">
            <span class="eh-name">${u(o.name)}</span>
            <span class="eh-status">${u(da(o.status))}${o.since?` &middot; ${u(o.since)}`:""}</span>
            ${o.note?`<span class="eh-note">${u(o.note)}</span>`:""}
          </li>
        `).join("")}
      </ul>
      <div class="modal-actions">
        <button class="btn-cta modal-cancel">Close</button>
      </div>
    </div>
  `,{label:"The Empire"})}function At(e){const t=document.getElementById("mode-section");t&&(t.style.display=e>1?"":"none")}function Bt(e,t=[],n=[]){const a=document.getElementById("player-names");let s="";for(let r=0;r<e;r++){const o=t[r]||`Player ${r+1}`;s+=`
      <div class="name-input-group">
        <span class="player-seal" data-index="${r}" style="--pc: ${M[r]}"
              aria-hidden="true">${u(J(o,r))}</span>
        <label>Player ${r+1}</label>
        <input type="text" class="player-name-input" placeholder="Enter name"
               value="${vt(o)}" data-index="${r}"
               style="--pc: ${M[r]}">
      </div>
    `}a.innerHTML=s,a.querySelectorAll(".player-name-input").forEach(r=>{r.addEventListener("input",()=>{const o=Number(r.dataset.index),c=a.querySelector(`.player-seal[data-index="${o}"]`);c&&(c.textContent=J(r.value,o))})})}function xa(){const{campaign:e}=p(),t=e&&e.chapter;T.innerHTML=`
    <div class="loading-screen">
      <div class="logo">Clue d&rsquo;&Eacute;tat</div>
      ${t?`<div class="chapter-kicker">Chapter ${t.number} &middot; ${u(t.title)}</div>`:""}
      <div class="loading-spinner"></div>
      <div class="loading-text">${t?"Drawing up the order of battle&hellip;":"Loading clues..."}</div>
    </div>
  `}function qa(){const{campaign:e,gameLength:t}=p(),n=e&&e.chapter;if(!n){Lt();return}const a=Me(n,t);T.innerHTML=`
    <div class="chapter-intro-screen">
      <div class="chapter-kicker">Chapter ${n.number} of ${it()} &middot; ${u(n.years)}</div>
      <h1 class="chapter-title">${u(n.title)}</h1>
      <div class="chapter-stage">${u(n.stage)} &middot; ${u(n.place)}</div>
      <p class="chapter-blurb">${u(n.blurb)}</p>
      <div class="host-line">${u(n.quote.text)}<span class="host-attrib">${u(n.quote.by)}</span></div>
      <div class="chapter-intro-facts">
        <span>Target ${B(a)}</span>
        <span>${dt(n)}s per clue</span>
        <span>${en(n.tier)}</span>
        <span>${ut} chapter clues = Légion d&rsquo;honneur</span>
      </div>
      <button class="btn-continue" id="btn-begin-chapter">To the board</button>
      <button class="link-btn" id="btn-intro-empire">The Empire at this point</button>
    </div>
  `;const s=document.getElementById("btn-begin-chapter");s.focus(),s.addEventListener("click",()=>{U=!1,Lt()}),document.getElementById("btn-intro-empire").addEventListener("click",()=>gt(n))}const Pa={round:{title:"Couldn&rsquo;t deal this board",body:"The clues for this round didn&rsquo;t arrive. One more try usually does it."},final:{title:"Couldn&rsquo;t reach the final clue",body:"The board is done, but the last clue didn&rsquo;t load. Try again to finish the game."},campaign:{title:"Couldn&rsquo;t unroll the Campaign",body:"The chapter list didn&rsquo;t load. Check your connection and try again."}};function Ra(){const{errorContext:e}=p(),t=Pa[e]||{title:"Couldn&rsquo;t load the clues",body:"Check your connection and try again."},n=e==="round"||e==="final";T.innerHTML=`
    <div class="loading-screen">
      <div class="logo">Clue d&rsquo;&Eacute;tat</div>
      <div class="error-box" role="alert">
        <h1 class="error-title">${t.title}</h1>
        <p class="error-body">${t.body}</p>
        <div class="error-actions">
          ${n?'<button class="btn-cta" id="btn-error-retry">Try again</button>':""}
          <button class="btn-quiet" id="btn-error-menu">Back to menu</button>
        </div>
      </div>
    </div>
  `;const a=document.getElementById("btn-error-retry");a&&a.addEventListener("click",()=>{O=null,fa()}),document.getElementById("btn-error-menu").addEventListener("click",()=>{O=null,at()}),q(a||document.getElementById("btn-error-menu"))}function Da(){const{categories:e,players:t,activePlayer:n,round:a,cluesAnswered:s,totalClues:r,gameMode:o,campaign:c,gameLength:l}=p(),i=c&&c.chapter,d=i?`Chapter ${i.number} · ${i.title} · ${a===1?"Round I":"Round II · Doubled"}`:a===1?"Campaign I":"Campaign II · Doubled",m=Math.round(s/r*100);if(ft=D(ln),T.innerHTML=`
    <div class="board-screen">
      <div class="board-header">
        <div class="board-controls">
          <button class="btn-menu" id="btn-menu" aria-label="Game menu" title="Game menu (Esc)">
            <i class="ph ph-list" aria-hidden="true"></i>
          </button>
          <button class="btn-menu btn-help" id="btn-board-help"
                  aria-label="How to play" title="How to play">
            <span aria-hidden="true">?</span>
          </button>
        </div>
        <div class="board-brand">
          <h1 class="board-title">Clue d&rsquo;&Eacute;tat</h1>
          <div class="round-meta">
            <h2 class="round-name">${d}</h2>
            <div class="round-progress" role="img"
                 aria-label="${s} of ${r} clues played">
              <div class="round-progress-fill" style="--fill:${m/100}"></div>
            </div>
          </div>
        </div>
        <div class="scoreboard" role="list" aria-label="Scores">
          ${t.map((h,g)=>`
            <div class="player-score ${g===n?"active":""}" role="listitem"
                 style="--pc: ${M[g]}">
              <div class="player-avatar" aria-hidden="true">${u(h.avatar||J(h.name))}</div>
              <div class="player-meta">
                <div class="player-name">
                  ${u(h.name)}${t.length>1&&g===n?'<span class="turn-tag">picking</span>':""}
                  ${h.streak>=2?`<span class="streak" title="${h.streak} correct in a row">&times;${h.streak}</span>`:""}
                </div>
                <div class="player-amount ${h.score<0?"negative":""}" data-index="${g}">
                  <span class="sr-only">${u(h.name)} has </span>${B(h.score)}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="board-stage">
        <div class="game-board" id="game-board" role="group"
             aria-label="Clue board, six categories. Arrow keys move, Enter opens a clue.">
          ${e.map((h,g)=>`
            <div class="board-category ${h.themed?"themed":""}" data-cat="${g}">
              <div class="category-header" ${h.themed?`title="This chapter's category — three right answers earn the Légion d'honneur"`:""}>${u(h.name)}</div>
              ${h.clues.map((b,$)=>`
                <button type="button"
                     class="board-clue ${b.answered?"answered":""}"
                     data-cat="${g}" data-clue="${$}"
                     tabindex="-1"
                     ${b.answered?"disabled":""}
                     aria-label="${vt(h.name)}, $${b.value}${b.answered?", already played":""}">
                  <span aria-hidden="true">${b.answered?"":"$"+b.value}</span>
                </button>
              `).join("")}
            </div>
          `).join("")}
        </div>
        <aside class="board-host" aria-hidden="true">
          <img src="./assets/napoleon-lowpoly-full.webp" alt="" decoding="async">
        </aside>
      </div>
      <div class="board-footer">
        <div class="host-dock">
          <div class="host-monogram" aria-hidden="true">N</div>
          <!-- Spoken through the shared announcer below, so no aria-live here. -->
          <div class="host-plaque" id="host-plaque">${Na()}</div>
        </div>
        <div class="board-footer-info">
          ${s===0?'<button class="reroll-btn" id="btn-reroll">Redraw the map</button>':""}
          <div class="clues-remaining">
            <span>${r-s} of ${r} clues left</span>
            ${i?`<span>target ${B(Me(i,l))}</span>`:""}
            ${o==="buzz"?`<span>buzzers: ${t.map((h,g)=>`${u(h.name)} <span class="key-hint">${Se[g].toUpperCase()}</span>`).join(" ")}</span>`:""}
          </div>
        </div>
        <div class="guest-panel" role="group" aria-label="Tonight&rsquo;s guests">
          <div class="guest-title">Tonight&rsquo;s guests</div>
          <img class="guest-strip" src="./assets/historical-guests.webp" alt="" decoding="async">
          <div class="guest-names"><span>Cleopatra</span><span>Leonardo da Vinci</span><span>Marie Curie</span></div>
        </div>
      </div>
    </div>
  `,!U){U=!0;const h=document.getElementById("game-board");h.classList.add("revealing"),setTimeout(()=>h.classList.remove("revealing"),800)}if(t.forEach((h,g)=>{if(X[g]!==void 0&&X[g]!==h.score){const b=document.querySelector(`.player-amount[data-index="${g}"]`);b&&b.classList.add("bump")}}),X=t.map(h=>h.score),t.length>1){const h=Math.max(...t.map($=>$.score)),g=t.map(($,P)=>P).filter($=>t[$].score===h),b=g.length===1?g[0]:null;b!==null&&ee!==null&&b!==ee&&(gn(`${u(t[b].name)} seizes the lead!`,M[b]),Vn()),b!==null&&(ee=b)}document.getElementById("btn-menu").addEventListener("click",fn),document.getElementById("btn-board-help").addEventListener("click",ve);const f=document.getElementById("btn-reroll");f&&f.addEventListener("click",()=>{U=!1,ha()});const v=h=>{const g=parseInt(h.dataset.cat),b=parseInt(h.dataset.clue);Ha(h,()=>ga(g,b))};document.querySelectorAll(".board-clue:not(.answered)").forEach(h=>{h.addEventListener("click",()=>v(h))}),Oa(v),p().showCategoryIntro?(p().showCategoryIntro=!1,ja(e)):(Ze(),pt&&!document.querySelector(".modal-overlay")&&xe()),j(L?`${Mt()} ${r-s} clues left.`:`${d}. ${Mt()}`),L=null}function Mt(){const{players:e,activePlayer:t}=p(),n=e.length>1?`${e[t].name}, choose your battlefield.`:ft;if(!L)return n;const a=L.delta?` ${L.delta>0?"Plus":"Minus"} ${B(Math.abs(L.delta))}.`:"";return`${L.line}${a} ${n}`}function Na(){const{players:e,activePlayer:t}=p(),n=e.length>1?e[t].name:null,a=n?`<strong style="color: ${M[t]}">${u(n)}</strong>, choose your battlefield.`:u(ft);if(!L)return a;const s=L.correct===!0?"good":L.correct===!1?"bad":"neutral",r=L.delta?`<span class="beat-delta">${L.delta>0?"+":"&minus;"}$${E(Math.abs(L.delta))}</span>`:"";return`
    <span class="host-beat ${s}">${u(L.line)} ${r}</span>
    <span class="host-turn">${a}</span>
  `}function Ze(){if(Te().seenBoardCoach||document.querySelector(".modal-overlay, .category-intro"))return;const e=p().gameMode==="buzz",t=se(`
    <div class="modal coach">
      <div class="coach-eyebrow">New here?</div>
      <div class="modal-title">How this round works</div>
      <ol class="coach-steps">
        <li><strong>Pick a clue.</strong> Tap a dollar amount &mdash; the bigger the number, the harder the clue.</li>
        <li><strong>Answer in plain words.</strong> Spelling and phrasing are forgiven${e?", and whoever rings in first gets to answer":""}.</li>
        <li><strong>Right adds, wrong subtracts.</strong> Pass instead and you lose nothing.</li>
      </ol>
      <p class="coach-keys">
        Using a keyboard? <span class="key-hint">&larr;</span><span class="key-hint">&rarr;</span><span class="key-hint">&uarr;</span><span class="key-hint">&darr;</span>
        move around the board, <span class="key-hint">Enter</span> opens a clue,
        <span class="key-hint">Esc</span> opens the menu.
      </p>
      <div class="modal-actions coach-actions">
        <button class="btn-cta modal-cancel">Got it &mdash; let&rsquo;s play</button>
        <button class="link-btn" id="coach-more">Full rules</button>
      </div>
    </div>
  `,{label:"How this round works",onClose:()=>{V({seenBoardCoach:!0}),xe()}});t&&t.overlay.querySelector("#coach-more").addEventListener("click",()=>{t.close(),ve()})}let de=null;function se(e,{label:t,onClose:n}={}){if(document.querySelector(".modal-overlay"))return null;const a=document.activeElement,s=document.createElement("div");s.className="modal-overlay",s.innerHTML=e;const r=s.firstElementChild;r&&(r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true"),t&&r.setAttribute("aria-label",t)),document.body.appendChild(s);const o=()=>Array.from(s.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')),c=i=>{if(i.key!=="Tab")return;const d=o();if(d.length===0)return;const m=d[0],f=d[d.length-1];i.shiftKey&&document.activeElement===m?(i.preventDefault(),f.focus()):!i.shiftKey&&document.activeElement===f&&(i.preventDefault(),m.focus())};s.addEventListener("keydown",c);const l=()=>{s.remove(),de===l&&(de=null),a&&document.contains(a)&&q(a),n==null||n()};return de=l,s.addEventListener("click",i=>{i.target===s&&l()}),s.querySelectorAll(".modal-cancel").forEach(i=>i.addEventListener("click",l)),q(o()[0]),{overlay:s,close:l}}function ve(){se(`
    <div class="modal how-to">
      <div class="modal-title">How to play</div>
      <p class="how-to-lead">One board, six categories, thirty clues. Clear the board, then face the final clue.</p>
      <ol class="how-to-list numbered">
        <li><strong>Pick a clue</strong> from the board. Rows go from easy at the top to hardest at the bottom, and the dollar amount tells you how hard it is.</li>
        <li><strong>Answer in plain words.</strong> Spelling and phrasing are forgiven, and you don't need to say "What is…".</li>
        <li><strong>Right adds the amount, wrong subtracts it.</strong> <strong>Pass</strong> costs nothing if you'd rather not guess.</li>
        <li><strong>Three right in a row</strong> starts <strong>Campaign Momentum</strong> — a bonus that grows with the run.</li>
        <li>When the board is clear, everyone wagers on one <strong>final clue</strong>, then the scores are revealed.</li>
      </ol>
      <div class="how-to-sub">Good to know</div>
      <ul class="how-to-list">
        <li><strong>Keyboard:</strong> arrow keys move around the board, <span class="key-hint">Enter</span> opens a clue, <span class="key-hint">Esc</span> opens the menu, and <span class="key-hint">?</span> reopens this card.</li>
        <li><strong>Buzz In! mode:</strong> race to ring in with your key (<span class="key-hint">Q</span> <span class="key-hint">P</span> <span class="key-hint">B</span>) or by tapping your buzzer, once the clue has been read. Ring in too early and you're locked out for a moment.</li>
        <li><strong>Waterloo Wagers</strong> hide on the board and let you bet your winnings on a single clue.</li>
        <li><strong>The table is the judge.</strong> If a close answer gets marked wrong, hit <strong>"The Emperor accepts it"</strong> and the score is put right.</li>
        <li><strong>Playing solo?</strong> Chase a Rank — S is Grand Champion — and beat your personal best.</li>
        <li><strong>Question packs:</strong> Fresh Pack is written just for this game, and Easy Breezy is gentler. No category repeats until you've seen a whole pack.</li>
        <li><strong>The Campaign:</strong> Napoleon's life in 15 chapters, from cadet to Saint Helena. Hit a chapter's score target and the Empire on your ledger grows, exactly as history did.</li>
      </ul>
      <div class="modal-actions">
        <button class="btn-cta modal-cancel">Got it</button>
      </div>
    </div>
  `,{label:"How to play"})}function fn(){const e=se(`
    <div class="modal game-menu">
      <div class="modal-title">Game menu</div>
      <div class="menu-list">
        <button class="menu-item modal-cancel" id="menu-resume">
          <span class="menu-item-name">Back to the board</span>
          <span class="menu-item-sub">Keep playing this round</span>
        </button>
        <button class="menu-item" id="menu-help">
          <span class="menu-item-name">How to play</span>
          <span class="menu-item-sub">Scoring, keys and the final clue</span>
        </button>
        <button class="menu-item" id="menu-sound" aria-pressed="${oe()}">
          <span class="menu-item-name">Sound effects</span>
          <span class="menu-item-sub" id="menu-sound-state">${oe()?"On":"Off"}</span>
        </button>
        <button class="menu-item danger" id="menu-quit">
          <span class="menu-item-name">Leave this game</span>
          <span class="menu-item-sub">Scores won&rsquo;t be saved</span>
        </button>
      </div>
    </div>
  `,{label:"Game menu"});if(!e)return;e.overlay.querySelector("#menu-help").addEventListener("click",()=>{e.close(),ve()});const t=e.overlay.querySelector("#menu-sound");t.addEventListener("click",()=>{const n=!oe();Je(n),V({sound:n}),t.setAttribute("aria-pressed",String(n)),e.overlay.querySelector("#menu-sound-state").textContent=n?"On":"Off"}),e.overlay.querySelector("#menu-quit").addEventListener("click",()=>{e.close(),hn()})}function hn(){const{cluesAnswered:e,totalClues:t,screen:n}=p();let a;n==="chapter-intro"?a="Nothing has been played yet.":["board","clue","daily-double"].includes(n)?a=e>0?`You're ${e} of ${t} clues into this round.`:"Nothing has been played yet.":a="The board is finished, but these scores aren&rsquo;t recorded yet.";const s=se(`
    <div class="modal">
      <div class="modal-title">Leave this game?</div>
      <div class="modal-body">${a} Scores won&rsquo;t be saved.</div>
      <div class="modal-actions">
        <button class="btn-quiet modal-cancel">Keep playing</button>
        <button class="btn-danger modal-confirm">Leave game</button>
      </div>
    </div>
  `,{label:"Leave game"});s&&s.overlay.querySelector(".modal-confirm").addEventListener("click",()=>{s.close(),mn(),O=null,U=!1,X=[],ee=null,L=null,Ce(),at()})}window.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(document.querySelector(".modal-overlay")){de?de():document.querySelector(".modal-overlay").remove();return}const t=p().screen;if(t==="board"){fn();return}["chapter-intro","clue","daily-double","round-transition","final-category","final-wager","final-clue","final-answer"].includes(t)&&hn()});const te=6,Ee=5;let ue=null,C={c:0,r:0};function Xe(){ue&&(window.removeEventListener("keydown",ue),ue=null)}const W=(e,t)=>document.querySelector(`.board-clue[data-cat="${e}"][data-clue="${t}"]`);function Ne(){document.querySelectorAll(".board-clue").forEach(t=>{t.classList.remove("cursor"),t.tabIndex=-1});const e=W(C.c,C.r);e&&(e.classList.add("cursor"),e.tabIndex=0)}function xe(){const e=W(C.c,C.r);e&&!e.disabled&&q(e)}function Y(e,t){const n=e!==0?te:Ee;let{c:a,r:s}=C;for(let r=0;r<n;r++){a=(a+e+te)%te,s=(s+t+Ee)%Ee;const o=W(a,s);if(o&&!o.disabled)return C={c:a,r:s},!0}return!1}function Oa(e){Xe();const t=W(C.c,C.r);if(!t||t.disabled)e:for(let n=0;n<Ee;n++)for(let a=0;a<te;a++){const s=W(a,n);if(s&&!s.disabled){C={c:a,r:n};break e}}document.querySelectorAll(".board-clue").forEach(n=>{n.addEventListener("focus",()=>{C={c:Number(n.dataset.cat),r:Number(n.dataset.clue)},Ne()})}),ue=n=>{var o,c;if(p().screen!=="board"||document.querySelector(".modal-overlay, .category-intro")||n.metaKey||n.ctrlKey||n.altKey)return;const a=n.target instanceof Element&&n.target.classList.contains("board-clue");if(["Enter"," ","Spacebar"].includes(n.key)&&!a&&n.target instanceof Element&&n.target.closest("button, a, select, input, textarea"))return;let r=!0;switch(n.key){case"ArrowLeft":Y(-1,0);break;case"ArrowRight":Y(1,0);break;case"ArrowUp":Y(0,-1);break;case"ArrowDown":Y(0,1);break;case"Home":C={c:0,r:C.r},(o=W(0,C.r))!=null&&o.disabled&&Y(1,0);break;case"End":C={c:te-1,r:C.r},(c=W(te-1,C.r))!=null&&c.disabled&&Y(-1,0);break;case"Enter":case" ":case"Spacebar":{const l=W(C.c,C.r);if(l&&!l.disabled){Xe(),n.preventDefault(),e(l);return}break}case"?":n.preventDefault(),ve();return;default:r=!1}r&&(n.preventDefault(),Ne(),xe())},window.addEventListener("keydown",ue),Ne()}function gn(e,t="var(--brass)"){const n=document.createElement("div");n.className="toast",n.style.setProperty("--pc",t),n.innerHTML=e,document.body.appendChild(n),setTimeout(()=>n.classList.add("leaving"),2200),setTimeout(()=>n.remove(),2700)}function Ha(e,t){if(be()){t();return}const n=e.getBoundingClientRect(),a=document.createElement("div");a.className="cell-ghost",a.style.top=`${n.top}px`,a.style.left=`${n.left}px`,a.style.width=`${n.width}px`,a.style.height=`${n.height}px`,document.body.appendChild(a),requestAnimationFrame(()=>requestAnimationFrame(()=>a.classList.add("expand"))),setTimeout(()=>{t(),a.remove()},340)}function ja(e){if(be()){Ze();return}const t=document.createElement("div");t.className="category-intro",t.innerHTML=`
    <div class="ci-label">Tonight&rsquo;s battlefields&hellip;</div>
    <div class="ci-name" id="ci-name" aria-hidden="true"></div>
    <button type="button" class="ci-skip" id="ci-skip">Skip to the board</button>
  `,document.body.appendChild(t),j(`Tonight's categories: ${e.map(i=>i.name).join(", ")}.`);const n=t.querySelector("#ci-name");let a=0,s=null,r=!1;function o(){if(a>=e.length){c();return}n.textContent=e[a].name,n.classList.remove("pop"),n.offsetWidth,n.classList.add("pop"),Yn(),a++,s=setTimeout(o,1100)}function c(){r||(r=!0,clearTimeout(s),window.removeEventListener("keydown",l,!0),t.classList.add("fade-out"),setTimeout(()=>{t.remove(),Ze(),document.querySelector(".modal-overlay")||xe()},400))}const l=i=>{["Enter"," ","Spacebar","Escape"].includes(i.key)&&(i.preventDefault(),i.stopPropagation(),c())};window.addEventListener("keydown",l,!0),t.addEventListener("click",c),q(t.querySelector("#ci-skip")),o()}function Wa(){const{currentClue:e,gameMode:t,wagerAmount:n}=p();if(!e)return;t==="buzz"&&!e.isDailyDouble?Ka():_a();const a=e.isDailyDouble?n:e.value;j(`${e.categoryName}, ${B(a)}. ${e.clue}`)}function bn(e){const{currentClue:t}=p(),n=t.isDailyDouble,a=n?p().wagerAmount:t.value,s=p().clueSeconds||30;return`
    <div class="clue-screen">
      <div class="clue-header">
        <h2 class="clue-category">${u(t.categoryName)}</h2>
        <span class="clue-value">
          ${n?'<span class="clue-value-tag">Waterloo Wager</span>':""}
          <span class="clue-value-money">$${E(a)}</span>
        </span>
      </div>
      <div class="clue-timer">
        <div class="timer-bar-bg" aria-hidden="true">
          <div class="timer-bar" id="timer-bar"></div>
        </div>
        <span class="timer-text" id="timer-text" role="timer" aria-label="Seconds left">${s}</span>
        <span class="timer-unit" aria-hidden="true">sec</span>
      </div>
      <p class="clue-text">${u(t.clue)}</p>
      <p class="clue-stakes">
        Right <strong>+$${E(a)}</strong>
        &middot; wrong <strong>&minus;$${E(a)}</strong>
      </p>
      ${e}
      <div class="clue-feedback" id="clue-feedback" role="status" aria-live="polite"></div>
    </div>
  `}function N(e){var n;const t=document.getElementById("clue-feedback");t&&(t.innerHTML=e,t.classList.add("show"),(n=document.querySelector(".clue-screen"))==null||n.classList.add("resolved"),t.scrollIntoView({block:"nearest",behavior:be()?"auto":"smooth"}))}function vn(e){if(be())return;const t=document.createElement("div");t.className=`screen-flash ${e}`,document.body.appendChild(t),setTimeout(()=>t.remove(),550)}function bt(e){let t="";return e.bonus&&(t+=`<div class="streak-callout">Campaign Momentum &middot; ${e.streak} in a row &middot; +$${E(e.bonus)}</div>`),e.legion&&(t+=`<div class="streak-callout legion-callout">Légion d&rsquo;honneur &middot; ${ut} chapter clues &middot; +$${E(e.legion)}</div>`),t}function _a(){const{players:e,answeringPlayer:t,gameMode:n,currentClue:a}=p();T.innerHTML=bn(`
    <div class="clue-player">
      ${e.length>1?`<span>${u(e[t].name)}&rsquo;s ${a.isDailyDouble&&n==="buzz"?"Waterloo Wager":"turn"}</span>`:""}
    </div>
    <div class="clue-answer-area">
      <label class="answer-label" for="answer-input">Your answer</label>
      <input type="text" id="answer-input" class="answer-input"
             placeholder="Type your answer" autocomplete="off"
             autocapitalize="off" spellcheck="false" enterkeyhint="done"
             aria-describedby="answer-help">
      <p class="answer-help" id="answer-help">
        Plain words are fine &mdash; no &ldquo;What is&hellip;&rdquo; needed, and spelling is forgiven.
      </p>
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit answer</button>
        <button class="btn-skip" id="btn-skip">Pass &middot; no penalty</button>
      </div>
    </div>
  `),ht(p().clueSeconds||30,Aa);const s=document.getElementById("answer-input");setTimeout(()=>s.focus(),50),s.addEventListener("keydown",r=>{r.key==="Enter"&&xt()}),s.addEventListener("input",wn),document.getElementById("btn-submit").addEventListener("click",xt),document.getElementById("btn-skip").addEventListener("click",Ga)}function yn(){const e=document.getElementById("answer-input"),t=document.getElementById("answer-help");!e||!t||(e.classList.add("needs-answer"),e.setAttribute("aria-invalid","true"),t.classList.add("is-nudge"),t.textContent="Type an answer first — or use Pass to move on with no penalty.",j("Type an answer first, or use Pass to move on with no penalty."),e.focus())}function wn(){const e=document.getElementById("answer-input"),t=document.getElementById("answer-help");!e||!t||!t.classList.contains("is-nudge")||(e.classList.remove("needs-answer"),e.removeAttribute("aria-invalid"),t.classList.remove("is-nudge"),t.innerHTML="Plain words are fine &mdash; no &ldquo;What is&hellip;&rdquo; needed, and spelling is forgiven.")}function xt(){const e=document.getElementById("answer-input");if(!e||e.disabled)return;const t=e.value.trim();if(!t){yn();return}un(),e.disabled=!0,document.getElementById("btn-submit").disabled=!0,document.getElementById("btn-skip").disabled=!0;const n=an(t);if(n)if(vn(n.correct?"correct":"wrong"),n.correct){const a=D(rn);N(`
      <div class="feedback-correct">
        <div class="feedback-icon">${H("check")}</div>
        <div class="feedback-verdict">Correct</div>
        <div class="feedback-line">${a}</div>
        <div class="feedback-delta">+$${E(n.value)} &middot; ${pe()}</div>
        ${bt(n)}
      </div>
    `),fe(!0,a,n.value),ae(n.bonus?2400:2e3)}else{const a=D(on);N(`
      <div class="feedback-wrong">
        <div class="feedback-icon">${H("cross")}</div>
        <div class="feedback-verdict">Not quite</div>
        <div class="feedback-line">${a}</div>
        <div class="feedback-delta">&minus;$${E(n.value)} &middot; ${pe()}</div>
        <div class="correct-response">The correct response: <strong>${u(n.correctResponse)}</strong></div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Continue</button>
          <button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>
        </div>
      </div>
    `),fe(!1,a,-n.value,n.correctResponse),document.getElementById("btn-fb-continue").addEventListener("click",()=>{O=null,mt()}),document.getElementById("btn-fb-accept").addEventListener("click",tt),et()}}function et(){setTimeout(()=>q(document.getElementById("btn-fb-continue")),400)}function pe(){const{players:e,answeringPlayer:t}=p(),n=e[t];if(!n)return"";const a=`now at ${B(n.score)}`;return e.length>1?`${u(n.name)} ${a}`:a}function fe(e,t,n,a=null){const{players:s,answeringPlayer:r}=p(),o=s[r];L={correct:e,line:t,delta:n,response:a,name:o?o.name:"",multi:s.length>1}}function tt(){const e=ya();if(!e)return;N(`
    <div class="feedback-correct">
      <div class="feedback-icon">${H("check")}</div>
      <div class="feedback-verdict">The Emperor accepts it</div>
      <div class="feedback-delta">
        +$${E(e.value)}, penalty refunded &middot; ${Fa()}
      </div>
      ${bt(e)}
    </div>
  `);const{lastJudgment:t,players:n}=p(),a=t?n[t.playerIndex]:null;L={correct:!0,line:"The Emperor accepts it.",delta:e.value,response:null,name:a?a.name:"",multi:n.length>1},ae(e.bonus?2200:1800)}function Fa(){const{lastJudgment:e,players:t}=p(),n=e?t[e.playerIndex]:null;if(!n)return"";const a=`now at ${B(n.score)}`;return t.length>1?`${u(n.name)} ${a}`:a}function Ga(){un();const e=ka();e&&(N(`
    <div class="feedback-skip">
      <div class="feedback-verdict">Passed &mdash; nothing lost</div>
      <div class="correct-response">The correct response: <strong>${u(e.correctResponse)}</strong></div>
    </div>
  `),L={correct:null,line:"Passed. No ground gained, none lost.",delta:0,response:e.correctResponse,name:"",multi:p().players.length>1},ae(2500))}function Ka(){const{currentClue:e}=p();T.innerHTML=bn(`
    <button type="button" class="buzz-status" id="buzz-status">
      <span class="buzz-status-main">Reading the clue&hellip; buzzers locked</span>
      <span class="buzz-skip-hint">Tap here or press Space to open them now</span>
    </button>
    <div class="clue-answer-area" id="answer-area" hidden>
      <div class="clue-player" id="answering-name"></div>
      <label class="answer-label" for="answer-input">Your answer</label>
      <input type="text" id="answer-input" class="answer-input"
             placeholder="Type your answer" autocomplete="off"
             autocapitalize="off" spellcheck="false" enterkeyhint="done"
             aria-describedby="answer-help">
      <p class="answer-help" id="answer-help">
        Plain words are fine &mdash; no &ldquo;What is&hellip;&rdquo; needed, and spelling is forgiven.
      </p>
      <div class="clue-buttons">
        <button class="btn-submit" id="btn-submit">Submit answer</button>
      </div>
    </div>
    <div class="buzzer-row" id="buzzer-row" role="group" aria-label="Buzzers"></div>
  `),A="reading",Ye=p().players.map(()=>0),$n(),Ua(),document.getElementById("buzz-status").addEventListener("click",()=>{A==="reading"&&Ie()});const t=Math.min(1500+e.clue.length*25,6e3);Ve.push(setTimeout(Ie,t))}function $n(){const{players:e,buzzAttempted:t}=p(),n=document.getElementById("buzzer-row");n&&(n.innerHTML=e.map((a,s)=>`
    <button type="button" class="btn-buzzer ${t[s]?"out":""}" data-player="${s}"
            style="--pc: ${M[s]}" ${t[s]?"disabled":""}
            aria-label="${vt(a.name)} ${t[s]?"has already had a go at this clue":`buzzer, keyboard shortcut ${Se[s].toUpperCase()}`}">
      <span class="buzzer-name">${u(a.name)}</span>
      <span class="buzzer-key" aria-hidden="true">${t[s]?H("cross"):Se[s].toUpperCase()}</span>
    </button>
  `).join(""),n.querySelectorAll(".btn-buzzer:not(.out)").forEach(a=>{a.addEventListener("click",()=>kn(parseInt(a.dataset.player)))}))}function Ua(){le=e=>{if(e.repeat||A==="answering"||A==="done")return;if((e.key===" "||e.key==="Spacebar")&&A==="reading"){e.preventDefault(),Ie();return}const t=Se.indexOf(e.key.toLowerCase());t>=0&&t<p().players.length&&(e.preventDefault(),kn(t))},window.addEventListener("keydown",le)}function Ie(){if(A==="done")return;A="open";const e=document.getElementById("buzz-status");e&&(e.hidden=!1,e.innerHTML='<span class="buzz-status-main">Buzz in!</span>',e.classList.remove("too-early"),e.classList.add("open"),e.disabled=!0),j("Buzzers open."),Jn(),ht(7,Ya)}function kn(e){var o,c,l;const{buzzAttempted:t}=p();if(t[e]||Date.now()<Ye[e])return;if(A==="reading"){Ye[e]=Date.now()+1200,Un(),(o=navigator.vibrate)==null||o.call(navigator,[30,40,30]);const i=document.querySelector(`.btn-buzzer[data-player="${e}"]`);i&&(i.classList.add("locked"),setTimeout(()=>i.classList.remove("locked"),1200));const d=document.getElementById("buzz-status"),m=((c=p().players[e])==null?void 0:c.name)||"That buzzer";if(d&&!d.classList.contains("open")){const f=d.querySelector(".buzz-status-main");f&&(f.textContent=`${m} rang in too early — locked out for a moment`),d.classList.add("too-early"),setTimeout(()=>{if(d.classList.contains("open"))return;d.classList.remove("too-early");const v=d.querySelector(".buzz-status-main");v&&(v.textContent="Reading the clue… buzzers locked")},1400)}return}if(A!=="open")return;A="answering",clearInterval(K),(l=navigator.vibrate)==null||l.call(navigator,40),va(e);const{players:n}=p(),a=document.getElementById("buzz-status");a&&(a.hidden=!0,a.classList.remove("open")),document.getElementById("buzzer-row").hidden=!0;const s=document.getElementById("answer-area");s.hidden=!1,document.getElementById("answering-name").innerHTML=`<span class="buzzed-flash" style="--pc: ${M[e]}">${u(n[e].name)} buzzed in!</span>`,j(`${n[e].name} buzzed in. 12 seconds to answer.`);const r=document.getElementById("answer-input");setTimeout(()=>r.focus(),50),r.addEventListener("keydown",i=>{i.key==="Enter"&&qt(),i.stopPropagation()}),r.addEventListener("input",wn),document.getElementById("btn-submit").addEventListener("click",qt),ht(12,()=>En("",!0))}function qt(){const e=document.getElementById("answer-input");if(!e||e.disabled)return;const t=e.value.trim();if(!t){yn();return}En(t,!1)}function En(e,t){clearInterval(K);const n=document.getElementById("answer-input");n&&(n.disabled=!0);const a=document.getElementById("btn-submit");a&&(a.disabled=!0);const s=an(e);if(!s)return;if(vn(s.correct?"correct":"wrong"),s.correct){A="done";const c=D(rn);N(`
      <div class="feedback-correct">
        <div class="feedback-icon">${H("check")}</div>
        <div class="feedback-verdict">Correct</div>
        <div class="feedback-line">${c}</div>
        <div class="feedback-delta">+$${E(s.value)} &middot; ${pe()}</div>
        ${bt(s)}
      </div>
    `),fe(!0,c,s.value),ae(s.bonus?2400:2e3);return}const r=D(t?cn:on),o=`
    <div class="feedback-icon">${H(t?"clock":"cross")}</div>
    <div class="feedback-verdict">${t?"Time&rsquo;s up":"Not quite"}</div>
    <div class="feedback-line">${r}</div>
    <div class="feedback-delta">&minus;$${E(s.value)} &middot; ${pe()}</div>
  `;if(fe(!1,r,-s.value,s.canRebuzz?null:s.correctResponse),s.canRebuzz){N(`
      <div class="feedback-wrong">
        ${o}
        <div class="correct-response">${D(za)} ${s.remaining} player${s.remaining>1?"s":""} can buzz.</div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Open Buzzers</button>
          ${t?"":'<button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>'}
        </div>
      </div>
    `),document.getElementById("btn-fb-continue").addEventListener("click",Ja);const c=document.getElementById("btn-fb-accept");c&&c.addEventListener("click",tt),et()}else{A="done",N(`
      <div class="feedback-wrong">
        ${o}
        <div class="correct-response">The correct response: <strong>${u(s.correctResponse)}</strong></div>
        <div class="feedback-actions">
          <button class="btn-feedback-continue" id="btn-fb-continue">Continue</button>
          ${t?"":'<button class="btn-feedback-accept" id="btn-fb-accept">The Emperor accepts it</button>'}
        </div>
      </div>
    `),document.getElementById("btn-fb-continue").addEventListener("click",()=>{O=null,mt()});const c=document.getElementById("btn-fb-accept");c&&c.addEventListener("click",tt),et()}}function Ja(){var a;const e=document.getElementById("clue-feedback");e&&(e.innerHTML="",e.classList.remove("show")),(a=document.querySelector(".clue-screen"))==null||a.classList.remove("resolved");const t=document.getElementById("answer-area");if(t){t.hidden=!0;const s=document.getElementById("answer-input");s&&(s.disabled=!1,s.value="");const r=document.getElementById("btn-submit");r&&(r.disabled=!1)}const n=document.getElementById("buzzer-row");n&&(n.hidden=!1),$n(),Ie()}function Ya(){A="done";const e=wa();if(!e)return;const t=document.getElementById("buzz-status");t&&(t.hidden=!0,t.classList.remove("open"));const n=D(Ta);N(`
    <div class="feedback-skip">
      <div class="feedback-verdict">No one rang in &mdash; nothing lost</div>
      <div class="feedback-line">${n}</div>
      <div class="correct-response">The correct response: <strong>${u(e.correctResponse)}</strong></div>
    </div>
  `),L={correct:null,line:n,delta:0,response:e.correctResponse,name:"",multi:p().players.length>1},ae(2500)}function Va(){const{currentClue:e,players:t,answeringPlayer:n}=p(),a=t[n],s=Math.max(a.score,e.value*2);T.innerHTML=`
    <div class="daily-double-screen">
      <div class="dd-flash">
        <div class="dd-title">WATERLOO<br>WAGER</div>
        <div class="host-line">A bold wager. I approve of nothing less.<span class="host-attrib">The Emperor</span></div>
      </div>
      <div class="dd-content">
        <div class="dd-category">${u(e.categoryName)}</div>
        <div class="dd-player">${u(a.name)}</div>
        <div class="dd-score">Current score: $${E(a.score)}</div>
        <div class="dd-wager-area">
          <label for="wager-input">Your wager</label>
          <div class="wager-input-row">
            <span class="wager-dollar" aria-hidden="true">$</span>
            <input type="number" id="wager-input" class="wager-input"
                   inputmode="numeric" aria-describedby="wager-range"
                   min="5" max="${s}" value="${Math.min(1e3,s)}" step="100">
          </div>
          <div class="wager-range" id="wager-range">
            Anything from $5 to $${E(s)}. Get it right and you win the wager; get it wrong and you lose it.
          </div>
          <div class="wager-presets" role="group" aria-label="Wager shortcuts">
            <button type="button" class="btn-preset" data-amount="500">$500</button>
            <button type="button" class="btn-preset" data-amount="1000">$1,000</button>
            <button type="button" class="btn-preset" data-amount="${Math.floor(s/2)}">Half</button>
            <button type="button" class="btn-preset" data-amount="${s}">All in</button>
          </div>
          <button class="btn-wager-submit" id="btn-wager">Lock in wager</button>
        </div>
      </div>
    </div>
  `;const r=document.getElementById("wager-input");r.focus(),r.select(),document.querySelectorAll(".btn-preset").forEach(l=>{l.addEventListener("click",()=>{r.value=l.dataset.amount})});const o=document.getElementById("wager-range"),c=()=>{const l=parseInt(r.value)||0,i=Math.max(5,Math.min(l,s));if(i!==l&&!r.dataset.clamped){r.value=String(i),r.dataset.clamped="1",o.classList.add("is-nudge"),o.textContent=l>s?`You can wager at most $${E(s)} — set to that. Lock it in to confirm.`:"The smallest wager is $5 — set to that. Lock it in to confirm.",j(o.textContent),r.focus(),r.select();return}ba(i)};r.addEventListener("input",()=>{delete r.dataset.clamped}),document.getElementById("btn-wager").addEventListener("click",c),r.addEventListener("keydown",l=>{l.key==="Enter"&&c()})}function Qa(){const{players:e}=p(),t=e.reduce((a,s,r,o)=>s.score<o[a].score?r:a,0);T.innerHTML=`
    <div class="transition-screen">
      <div class="transition-scores">
        <h3>${p().campaign?"End of Round I":"End of Campaign I"}</h3>
        ${e.map(a=>`
          <div class="transition-player">
            <span>${u(a.name)}</span>
            <span class="${a.score<0?"negative":""}">$${E(a.score)}</span>
          </div>
        `).join("")}
      </div>
      <div class="transition-title">${p().campaign?"Round II":"Campaign II"}</div>
      <div class="transition-subtitle">All values are doubled!${p().campaign?" Napoleon's own chapter joins the board.":""}</div>
      ${e.length>1?`<div class="transition-note"><strong>${u(e[t].name)}</strong> is trailing and gets first pick</div>`:""}
      <button class="btn-continue" id="btn-continue">March On</button>
    </div>
  `,Vt();const n=document.getElementById("btn-continue");n.addEventListener("click",()=>{U=!1,Ea()}),q(n)}function ne(){const{campaign:e}=p();return e?"The Decisive Hour":"Waterloo"}function Za(){const{finalClue:e,players:t}=p();T.innerHTML=`
    <div class="final-screen">
      <div class="final-header">${ne()}</div>
      <div class="final-scores">
        ${t.map(a=>`
          <div class="transition-player">
            <span>${u(a.name)}</span>
            <span class="${a.score<0?"negative":""}">$${E(a.score)}</span>
          </div>
        `).join("")}
      </div>
      <div class="final-category-reveal">
        <div class="final-category-label">The final battlefield:</div>
        <div class="final-category-name">${u(e.name)}</div>
        <div class="host-line">Waterloo. Where everything is decided.<span class="host-attrib">The Emperor</span></div>
      </div>
      <button class="btn-continue" id="btn-final-wager">Place Wagers</button>
    </div>
  `,Ae();const n=document.getElementById("btn-final-wager");n.addEventListener("click",()=>{y({screen:"final-wager"})}),q(n)}function Ln(e,t,n){const a=p().players[e];T.innerHTML=`
    <div class="final-screen">
      <div class="final-header">${ne()}</div>
      <div class="pass-card">
        <div class="pass-avatar" style="--pc: ${M[e]}">${u(a.avatar||J(a.name))}</div>
        <div class="pass-name">Pass the device to ${u(a.name)}</div>
        <div class="pass-sub">${t}</div>
        <button class="btn-cta pass-go" id="pass-go">I'm ${u(a.name)} — Ready</button>
      </div>
    </div>
  `;const s=document.getElementById("pass-go");s.focus(),s.addEventListener("click",n)}function Xa(){const{players:e}=p(),t=e.map(()=>0),n=e.map((c,l)=>l).filter(c=>e[c].score>0),a=e.length===1;if(n.length===0){Ct(t);return}let s=0;const r=()=>{if(s>=n.length){Ct(t);return}const c=n[s];a?o(c):Ln(c,"Place your secret wager",()=>o(c))};function o(c){const l=e[c],i=Math.max(0,l.score);T.innerHTML=`
      <div class="final-screen">
        <div class="final-header">${ne()}</div>
        <div class="final-subtitle" style="--pc:${M[c]}">${u(l.name)} — you have $${E(l.score)}</div>
        <div class="dd-wager-area" style="max-width:380px;width:100%">
          <label for="wager-input">Your secret wager</label>
          <div class="wager-input-row">
            <span class="wager-dollar" aria-hidden="true">$</span>
            <input type="number" id="wager-input" class="wager-input" inputmode="numeric"
                   aria-describedby="wager-range" min="0" max="${i}"
                   value="${Math.min(1e3,i)}" step="100">
          </div>
          <div class="wager-range" id="wager-range">Anything from $0 to $${E(i)}</div>
          <div class="wager-presets" role="group" aria-label="Wager shortcuts">
            <button type="button" class="btn-preset" data-amount="0">Nothing</button>
            <button type="button" class="btn-preset" data-amount="${Math.floor(i/2)}">Half</button>
            <button type="button" class="btn-preset" data-amount="${i}">All in</button>
          </div>
          <button class="btn-wager-submit" id="btn-lock">${s<n.length-1?"Lock In &amp; Pass":"Lock In Wager"}</button>
        </div>
      </div>
    `;const d=document.getElementById("wager-input");d.focus(),d.select(),document.querySelectorAll(".btn-preset").forEach(f=>f.addEventListener("click",()=>{d.value=f.dataset.amount}));const m=()=>{let f=parseInt(d.value)||0;t[c]=Math.max(0,Math.min(f,i)),s++,r()};document.getElementById("btn-lock").addEventListener("click",m),d.addEventListener("keydown",f=>{f.key==="Enter"&&m()})}r()}function es(){const{finalClue:e,players:t,finalWagers:n}=p(),a=t.length===1,s=t.map(()=>""),r=t.map((o,c)=>c).filter(o=>n[o]>0||t[o].score>0);T.innerHTML=`
    <div class="final-screen">
      <div class="final-header">${ne()}</div>
      <div class="final-category-name small">${u(e.name)}</div>
      <div class="final-clue-text">${u(e.clue)}</div>
      <div class="think-music-note">&#9835; Think music playing…</div>
      <button class="btn-submit" id="btn-begin-answers" style="max-width:340px">
        ${a?"Enter Answer":"Enter Answers"}
      </button>
    </div>
  `,q(document.getElementById("btn-begin-answers")),document.getElementById("btn-begin-answers").addEventListener("click",()=>{if(r.length===0){Ce(),St(s);return}let o=0;const c=()=>{if(o>=r.length){Ce(),St(s);return}const i=r[o];a?l(i):Ln(i,"Type your response (no peeking!)",()=>l(i))};function l(i){const d=t[i];T.innerHTML=`
        <div class="final-screen">
          <div class="final-header">${ne()}</div>
          <div class="final-category-name small">${u(e.name)}</div>
          <div class="final-clue-text" style="font-size:1.3rem">${u(e.clue)}</div>
          <div class="final-answer-form">
            <div class="final-answer-player">
              <label for="final-answer-input" style="--pc:${M[i]}">${u(d.name)} — your response</label>
              <input type="text" id="final-answer-input" class="answer-input" placeholder="Type your answer"
                     autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
            </div>
            <button class="btn-submit" id="btn-lock-answer">${o<r.length-1?"Lock In &amp; Pass":"Reveal Answers"}</button>
          </div>
        </div>
      `;const m=document.getElementById("final-answer-input");m.focus();const f=()=>{s[i]=m.value.trim(),o++,c()};document.getElementById("btn-lock-answer").addEventListener("click",f),m.addEventListener("keydown",v=>{v.key==="Enter"&&f()})}c()})}function ts(){const{finalClue:e,finalAnswers:t,finalWagers:n,players:a}=p();T.innerHTML=`
    <div class="final-screen">
      <div class="final-header">${ne()}</div>
      <div class="final-correct-response">
        <div class="label">Correct response:</div>
        <div class="response">${u(e.response)}</div>
      </div>
      <div class="final-results-list">
        ${a.map((r,o)=>`
          <div class="final-result-player ${t[o].correct?"correct":"wrong"}">
            <div class="frp-name">${u(r.name)}</div>
            <div class="frp-answer">"${u(t[o].answer||"(no answer)")}"</div>
            <div class="frp-wager">${t[o].correct?"+":"-"}$${E(n[o])}</div>
            <div class="frp-total">$${E(r.score)}</div>
            ${n[o]>0||t[o].answer?`
              <button class="btn-final-override" data-player="${o}">
                ${t[o].correct?"Mark wrong":"The Emperor accepts it"}
              </button>
            `:""}
          </div>
        `).join("")}
      </div>
      <button class="btn-continue" id="btn-show-results">Final Scores</button>
    </div>
  `,document.querySelectorAll(".btn-final-override").forEach(r=>{r.addEventListener("click",()=>{La(parseInt(r.dataset.player))})});const s=document.getElementById("btn-show-results");s.addEventListener("click",Ca),q(s)}let nt=!1;const we=[{letter:"S",title:"Grand Champion",acc:.9,full:22,quick:12},{letter:"A",title:"Tournament Ready",acc:.8,full:17,quick:9},{letter:"B",title:"Sharp Contender",acc:.65,full:12,quick:6},{letter:"C",title:"Warming Up",acc:.5,full:8,quick:4},{letter:"D",title:"Rookie Round",acc:0,full:0,quick:0}];function Cn(e,t){const n=e.correct+e.wrong,a=n?e.correct/n:0,s=t==="full"?"full":"quick";for(let r=0;r<we.length;r++){const o=we[r],c=r===we.length-1;if((o.letter==="C"?a>=o.acc||e.correct>=o[s]:a>=o.acc&&e.correct>=o[s])||c){const i=r>0?we[r-1]:null;return{...o,next:i?`Rank ${i.letter} needs ${i[s]}+ correct at ${Math.round(i.acc*100)}% accuracy`:null}}}}function ns(){const{campaign:e,chapterOutcome:t}=p();if(!e||!t)return"";const n=e.chapter,a=t,s=la(n);let r;if(a.won){const o=[];a.gained.length&&o.push(`The Empire grows: ${a.gained.map(u).join(", ")}.`),s.length&&o.push(`History takes its due: ${s.map(u).join(", ")}.`),o.length||o.push("The Empire holds its ground."),r=o.join(" ")}else r=`The table needed ${B(a.target)} and reached ${B(a.topScore)}. Regroup and refight this chapter${a.attempts>=2?"":" — after two setbacks the target eases"}.`;return`
    <div class="chapter-outcome ${a.won?"won":"lost"}">
      <div class="chapter-kicker">Chapter ${n.number} &middot; ${u(n.title)} &middot; ${u(n.years)}</div>
      <div class="co-title">${a.won?"Victory — the Campaign advances":"Setback — the chapter holds"}</div>
      <div class="co-body">${r}</div>
      ${a.won&&a.next?`<div class="co-next">Next: Chapter ${a.next.number} &middot; ${u(a.next.title)} (${u(a.next.years)})</div>`:""}
      ${a.campaignComplete?'<div class="co-next">The Campaign is complete — from Ajaccio to Saint Helena. Replay any chapter from the setup screen.</div>':""}
    </div>
  `}function as(){var b,$,P;const{players:e,gameLength:t,campaign:n}=p(),a=st(),s=a.best?a.best.score:null;nt||(In(e),nt=!0);const r=e.map((w,S)=>({...w,originalIndex:S})).sort((w,S)=>S.score-w.score),o=r[0],c=r.length>1&&r[0].score===r[1].score,l=e.length===1,i=l?Cn(o,t):null,d=l&&o.score>0&&(s===null||o.score>s),m=r.length===3?[r[1],r[0],r[2]]:r.length===2?[r[1],r[0]]:[r[0]],f=["I","II","III"],v=e.reduce((w,S)=>w+S.correct+S.wrong,0),h=v?Math.round(e.reduce((w,S)=>w+S.correct,0)/v*100):0;T.innerHTML=`
    <div class="results-screen">
      <h1 class="results-title">${l?`Rank ${i.letter} — ${i.title}`:c?"It's a Tie!":`${u(o.name)} Wins!`}</h1>
      <p class="results-summary">
        ${v} clue${v===1?"":"s"} answered
        &middot; ${h}% right
        &middot; ${t==="quick"?"one round":"two rounds"} and a final clue
      </p>
      ${d?'<div class="solo-best-callout">New personal best!</div>':""}
      ${l&&i.next?`<div class="solo-next-hint">${i.next}</div>`:""}
      ${!l&&!c?'<div class="host-line">Not since Austerlitz have I seen such form.<span class="host-attrib">The Emperor</span></div>':""}
      ${ns()}
      ${l?`
      <div class="solo-scorecard" style="--pc: ${M[0]}">
        <div class="podium-avatar">${u(o.avatar||J(o.name))}</div>
        <div class="solo-score-money ${o.score<0?"negative":""}">${B(o.score)}</div>
        <div class="solo-score-sub">${u(o.name)}'s winnings</div>
      </div>
      `:`
      <div class="podium">
        ${m.map(w=>{const S=r.indexOf(w)+1;return`
            <div class="podium-col rank-${S}" style="--pc: ${M[w.originalIndex]}">
              <div class="podium-avatar">${u(w.avatar||J(w.name))}</div>
              <div class="podium-name">${u(w.name)}</div>
              <div class="podium-money ${w.score<0?"negative":""}">$${E(w.score)}</div>
              <div class="podium-block">${f[S-1]}</div>
            </div>
          `}).join("")}
      </div>
      `}
      <div class="results-stats-list">
        ${r.map(w=>{const S=w.correct+w.wrong,F=S>0?Math.round(w.correct/S*100):0;return`
            <div class="result-stats-row">
              <span class="rsr-name" style="--pc: ${M[w.originalIndex]}">${u(w.name)}</span>
              <span class="rsr-stats">
                <span class="stat-good">${H("check")}${w.correct}<span class="sr-only"> right</span></span>
                <span class="stat-bad">${H("cross")}${w.wrong}<span class="sr-only"> wrong</span></span>
                <span>${F}%<span class="sr-only"> accuracy</span></span>
                ${w.bestStreak>=2?`<span>best run &times;${w.bestStreak}</span>`:""}
              </span>
            </div>
          `}).join("")}
      </div>
      <div class="results-actions">
        <button class="btn-play-again" id="btn-play-again">${n&&((b=p().chapterOutcome)!=null&&b.won)&&!(($=p().chapterOutcome)!=null&&$.campaignComplete)?"Next Chapter":"Play Again"}</button>
        ${n?'<button class="btn-quiet" id="btn-results-empire">The Empire</button>':""}
        <button class="btn-quiet btn-share" id="btn-share">Share Result</button>
      </div>
    </div>
  `,Ae(),(!c||r[0].score>0)&&rs(),document.getElementById("btn-play-again").addEventListener("click",()=>{O=null,U=!1,X=[],ee=null,at()}),document.getElementById("btn-share").addEventListener("click",()=>ss(r,c)),(P=document.getElementById("btn-results-empire"))==null||P.addEventListener("click",()=>gt(n.chapter)),q(document.getElementById("btn-play-again"));const g=w=>document.querySelector(w).textContent.replace(/\s+/g," ").trim();j(`${g(".results-title")}. ${g(".results-summary")}`)}function ss(e,t){var f;const n=["I","II","III"],a=e.length===1,s=e.map((v,h)=>`${n[h]||"•"} ${v.name} — ${B(v.score)}`),r=a?Cn(e[0],p().gameLength):null,{campaign:o,chapterOutcome:c}=p(),l=o?` — Chapter ${o.chapter.number}, ${o.chapter.title}${c!=null&&c.won?", won":""}`:"",d=`${a?`${e[0].name} hit Rank ${r.letter} (${r.title}) on Clue d'État${l}!`:t?`It's a tie on Clue d'État${l}!`:`${e[0].name} won Clue d'État${l}!`}
${s.join(`
`)}

Play: https://kellylucas314-cpu.github.io/Jeopardy/`,m=()=>gn("Result copied — go brag!","var(--brass)");(f=navigator.clipboard)!=null&&f.writeText?navigator.clipboard.writeText(d).then(m).catch(()=>Pt(d,m)):Pt(d,m)}function Pt(e,t){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select();try{document.execCommand("copy"),t()}catch{}n.remove()}function rs(){if(be())return;const e=["#a07430","#c8a15c","#c96f52","#41684e","#7e2d21","#2e7078"],t=document.createElement("div");t.className="confetti-container";for(let n=0;n<120;n++){const a=document.createElement("div");a.className="confetti",a.style.left=`${Math.random()*100}%`,a.style.background=e[Math.floor(Math.random()*e.length)],a.style.animationDuration=`${2.5+Math.random()*2.5}s`,a.style.animationDelay=`${Math.random()*1.5}s`,a.style.width=`${6+Math.random()*6}px`,a.style.height=`${8+Math.random()*8}px`,t.appendChild(a)}document.body.appendChild(t),setTimeout(()=>t.remove(),7e3)}function u(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}function vt(e){return u(e).replaceAll('"',"&quot;").replaceAll("'","&#39;")}function E(e){return e<0?"-"+Math.abs(e).toLocaleString():e.toLocaleString()}function B(e){return(e<0?"-$":"$")+Math.abs(e).toLocaleString()}dn();
