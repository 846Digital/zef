/* Garment photography in motion. Native scrolling; no scroll interception. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const slides=[
    {src:'assets/product-02-1.jpg',alt:'Куртки Racing Ferrari — фотосессия ZEF в гараже'},
    {src:'assets/product-01-2.jpg',alt:'Куртки Racing Red Bull — вид спереди'},
    {src:'assets/product-02-2.jpg',alt:'Красная куртка Ferrari — вышитые детали'},
  ];
  let slide=0, racingIndex=0, paused=false;
  const photo=$('#hero-image');
  function changeHero(direction){
    slide=(slide+direction+slides.length)%slides.length;
    const next=slides[slide];
    const apply=()=>{photo.src=next.src;photo.alt=next.alt;$('#hero-slide').textContent=`0${slide+1} / 03`;};
    if(!window.gsap||reduce.matches||paused){apply();return;}
    gsap.killTweensOf(photo);
    gsap.to(photo,{opacity:.15,x:direction*-16,duration:.2,ease:'power2.in',onComplete:()=>{apply();gsap.fromTo(photo,{x:direction*24,opacity:.15},{x:0,opacity:1,duration:.6,ease:'power3.out',clearProps:'transform'});}});
  }
  $('#hero-prev').addEventListener('click',()=>changeHero(-1));
  $('#hero-next').addEventListener('click',()=>changeHero(1));
  const photos=[...document.querySelectorAll('.racing-photo')];
  function racingStep(direction){
    racingIndex=(racingIndex+direction+photos.length)%photos.length;
    photos.forEach((p,i)=>{
      const active=i===racingIndex;
      p.style.zIndex=active?'3':String(2-((i+photos.length-racingIndex)%photos.length));
      if(window.gsap&&!reduce.matches&&!paused)gsap.to(p,{rotation:active?-3:(i===1?5:-8),x:active?0:(i-racingIndex)*12,y:active?0:8,duration:.65,ease:'power3.out',overwrite:true,opacity:1});
      else p.style.opacity='1';
    });
    $('#racing-number').textContent=`0${racingIndex+1}`;
  }
  $('#racing-prev').addEventListener('click',()=>racingStep(-1));
  $('#racing-next').addEventListener('click',()=>racingStep(1));
  // Split only this tagline. All other copy is readable without reveal effects.
  const tagline=$('#tagline');
  tagline.innerHTML=tagline.innerHTML.split(/(<br\s*\/?\s*>)/i).map(part=>/^<br/i.test(part)?part:part.split(' ').filter(Boolean).map(word=>`<span class="tagline-word">${word}</span>`).join(' ')).join('');
  if(!window.gsap||!window.ScrollTrigger){document.querySelectorAll('.tagline-word').forEach(w=>w.style.opacity='1');return;}
  gsap.registerPlugin(ScrollTrigger);
  let media;
  function setup(){
    media?.revert();
    if(paused){gsap.set('.tagline-word',{opacity:1});return;}
    media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo('.hero-kicker,.hero h1>span,.hero-copy>p,.hero-copy>.button',{y:24,opacity:0},{y:0,opacity:1,stagger:.08,duration:.8,ease:'power3.out',clearProps:'transform,opacity'});
      gsap.fromTo('.hero-visual',{opacity:0},{opacity:1,duration:.8,ease:'power2.out',clearProps:'opacity'});
      gsap.to('.tagline-word',{opacity:1,stagger:.12,ease:'power2.out',scrollTrigger:{trigger:'#tagline',start:'top 80%',end:'bottom 50%',scrub:1}});
    });
    media.add('(min-width: 961px) and (prefers-reduced-motion: no-preference)',()=>{
      const timeline=gsap.timeline({scrollTrigger:{trigger:'.racing-section',start:'top 88px',end:'bottom bottom',scrub:1,onUpdate:self=>{$('#racing-number').textContent=`0${Math.min(3,1+Math.floor(self.progress*3))}`;}}});
      timeline.to('.racing-photo-back',{xPercent:110,yPercent:-16,rotation:20,opacity:0,duration:1,ease:'power1.inOut'})
        .to('.racing-photo-front',{rotation:-4,duration:.5,ease:'power2.out'},'<.25')
        .to('.racing-photo-front',{xPercent:110,yPercent:-12,rotation:15,opacity:0,duration:1,ease:'power1.inOut'},'>.2')
        .to('.racing-photo-last',{rotation:0,scale:1.02,duration:.6,ease:'power2.out'},'<.25');
      gsap.to('.racing-progress>span',{scaleX:1,ease:'none',scrollTrigger:{trigger:'.racing-section',start:'top 88px',end:'bottom bottom',scrub:true}});
      gsap.fromTo('.store-card',{rotation:9,y:32},{rotation:5,y:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.store',start:'top 75%',once:true}});
    });
    ScrollTrigger.refresh();
  }
  setup();
  const toggle=$('#motion-toggle');
  toggle.addEventListener('click',()=>{
    paused=!paused;document.body.classList.toggle('motion-paused',paused);toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Возобновить анимации':'Приостановить анимации');toggle.querySelector('use').setAttribute('href',paused?'#i-play':'#i-pause');setup();
  });
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
  window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
})();
