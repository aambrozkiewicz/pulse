(function () {
 'use strict';
 var script=document.currentScript,site=script && script.dataset.site;
 if(!site || navigator.doNotTrack==='1' || navigator.globalPrivacyControl) return;
 var endpoint=new URL('/api/event',script.src).href,key='pulse:'+site, memory={};
 function read(k){try{return localStorage.getItem(key+k);}catch(e){return memory[k];}}
 function write(k,v){try{localStorage.setItem(key+k,v);}catch(e){memory[k]=v;}}
 function uuid(){return crypto.randomUUID();}
 var visitor=read(':visitor')||uuid();write(':visitor',visitor);
 var session,attribution={},lastPath='';
 function refresh(){var now=Date.now(),saved;try{saved=JSON.parse(read(':session')||'null');}catch(e){}
 if(!saved || now-saved.time>1800000){var q=new URLSearchParams(location.search); saved={id:uuid(),time:now,attr:{referrer:document.referrer.slice(0,500),utmSource:q.get('utm_source')||undefined,utmMedium:q.get('utm_medium')||undefined,utmCampaign:q.get('utm_campaign')||undefined}};}
 saved.time=now;session=saved.id;attribution=saved.attr;write(':session',JSON.stringify(saved));}
 function track(name,properties){refresh();var body=JSON.stringify(Object.assign({id:uuid(),site:site,visitorId:visitor,sessionId:session,name:name,path:location.pathname,properties:properties},attribution));
 fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:body,keepalive:true,credentials:'omit'}).catch(function(){});}
 window.analytics={track:track};
 function page(){if(lastPath!==location.pathname){lastPath=location.pathname;track('page_view');}}
 ['pushState','replaceState'].forEach(function(method){var old=history[method];history[method]=function(){var result=old.apply(this,arguments);page();return result;};});
 addEventListener('popstate',page);page();
 document.addEventListener('click',function(e){var el=e.target.closest && e.target.closest('[data-analytics]');if(el)track(el.dataset.analytics,{location:el.dataset.analyticsLocation||'unknown'});});
})();
