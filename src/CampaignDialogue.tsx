import {unitLabel} from './campaign-unit-label.ts';
import {useEffect,useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useCampaign} from './game/campaign-store.ts';
import {replies,talkStep} from './game/campaign-dialogue.ts';
import {CommanderPortrait,RolePortrait} from './CampaignArt.tsx';
import {isCommander} from './game/campaign.ts';
import './campaign-dialogue.css';
export function CampaignDialogue(){const {t}=useTranslation();const {game,dispatch}=useCampaign();const talk=game.talk;const heading=useRef<HTMLHeadingElement>(null);const step=talk?talkStep(talk):-1;
 useEffect(()=>{if(talk)heading.current?.focus();},[talk?.id,step]);
 const report=game.talkReports?.find(r=>r.team===game.playerTeam);
 if(!talk)return report?<details className="dialogue-report card"><summary>{t('d_lastReport',{day:report.day,quality:t(`d_quality_${report.quality}`)})}</summary><p>{t(report.abandoned?'d_leftReport':'d_finishedReport')}</p><ol>{report.rounds.filter(r=>r.answer).map((r,i)=><li key={i}>{t(`c_topic_${r.topic}`)} · {t(`d_reply_${r.answer}`)}{r.follow?` → ${t(`d_reply_${r.follow}`)}`:''}</li>)}</ol></details>:null;
 const round=talk.rounds[talk.index];const rivals=(['blue','green','white'] as const).filter(team=>team!==talk.team);const actor=game.units.find(u=>u.id===talk.unitId)!;
 return <section className={`dialogue-broadcast mode-${talk.mode} beat-${talk.beat}`} aria-labelledby="dialogue-title"><header><span className="dialogue-live">● {t('d_live')}</span><div><span className="campaign-kicker">{t(talk.mode==='stage'?`c_brand_${talk.brand}`:'d_network')}</span><h2 id="dialogue-title">{t(talk.mode==='stage'?'d_stageTitle':'d_debateTitle')}</h2></div><span>{t('d_progress',{round:talk.index+1,total:talk.rounds.length})}</span></header>
 <div className="dialogue-screens"><div className="dialogue-screen player-screen">{isCommander(actor)?<CommanderPortrait id={game.commanders[talk.team]}/>:<RolePortrait role={actor.role} helper={actor.helper}/>}<b>{unitLabel(game,actor,t)}</b><small>{t(talk.team)}</small></div><div className="dialogue-host"><RolePortrait role="heavy"/><span>{t(round.kind==='connection'?'d_connected':round.kind==='resident'?'d_resident':'d_moderator')}</span><strong>{t(`d_kind_${round.kind}`)}</strong><small>{t('d_fictional')}</small></div>{rivals.map(team=><div className="dialogue-screen rival-screen" key={team}><CommanderPortrait id={game.commanders[team]}/><b>{t(`c_commander_${game.commanders[team]}`)}</b><small>{t(team)}</small></div>)}</div>
 <div className="dialogue-ticker">{t('d_onAir')} / {t(`c_topic_${round.topic}`)} / {t('d_fictional')}</div>
 <div className="dialogue-body"><div className="dialogue-question"><span>{t(talk.beat==='answer'?'d_question':'d_counterTitle')}</span><h3 ref={heading} tabIndex={-1}>{t(talk.beat==='answer'?`d_question_${round.topic}_${round.need}`:`d_counter_${round.counter}`)}</h3>{talk.beat==='follow'&&<><p>{t('d_yourAnswer')}：{t(`d_reply_${round.answer}`)}</p><p>{t(`d_followNeed_${replies[(replies.indexOf(round.counter)+1)%4]}`)}</p></>}<p className="small-note">{t(talk.prepared===round.topic?'d_prepared':'d_unprepared')}</p></div>
 <div className="dialogue-options" role="group" aria-label={t(talk.beat==='answer'?'d_answerOptions':'d_followOptions')}>{replies.map(reply=><button className="dialogue-option" key={`${step}-${reply}`} onClick={()=>dispatch({type:'talkAnswer',unitId:actor.id,talkId:talk.id,step,reply})}><strong>{t(`d_reply_${reply}`)}</strong><small>{t(`d_replyDesc_${reply}`)}</small></button>)}</div></div>
 <footer><p>{t('d_reserved')}</p><button className="outline-button" onClick={()=>dispatch({type:'talkLeave',unitId:actor.id,talkId:talk.id})}>{t('d_leave')}</button></footer>
 </section>;
}
