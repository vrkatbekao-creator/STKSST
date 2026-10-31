import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from './game/store.ts';
import { guarded, damagePreview, distance } from './game/rules.ts';

export function CommanderPanel() {
  const { t } = useTranslation();
  const { game, guard } = useGame();
  const leader = game.units.find(u => u.id === 'b1');
  const active = leader && guarded(game, leader);
  const cooldown = Math.max(0, game.skillReadyDay - game.day);
  const disabled = !!game.result || !leader || cooldown > 0 || leader.ap < 2;
  const status = !leader ? t('leaderLost') : active ? t('guardRemaining', { count: leader.guardedUntil! - game.day + 1 }) : cooldown ? t('skillCooldown', { count: cooldown }) : leader.ap < 2 ? t('skillNeedsAp') : t('skillReady');
  return <section className="commander-panel" aria-label={t('commander')}>
    <div className="commander-portrait" aria-hidden="true">♜</div>
    <div className="commander-identity"><span className="eyebrow">{t('commander')} · {leader?`${String.fromCharCode(65+leader.x)}${leader.y+1}`:'—'}</span><h2>{t('commanderName')}</h2><p>{t('commanderRole')}</p></div>
    <div className="commander-description"><strong>{t('guardName')}</strong><p>{t('guardDescription')}</p><span className={active ? 'guard-active' : ''}>{status}</span></div>
    <button className="primary guard-button" onClick={guard} disabled={disabled} aria-describedby="guard-cost">{t('activateGuard')}<small id="guard-cost">2 AP / {t('cooldownDays',{count:6})}</small></button>
  </section>;
}

export function NewsPanel() {
  const { t } = useTranslation();
  const event = useGame(s => s.game.event);
  return <section className={`event-panel ${event ? 'event-active' : ''}`} aria-label={t('eventHeading')}>
    <div className="event-label"><span>{event ? '⚡' : '◉'}</span><strong>{t('eventHeading')}</strong></div>
    <div><h2>{t(event ? `event_${event.id}` : 'eventQuiet')}</h2><p>{t(event ? `eventBody_${event.id}` : 'eventQuietBody')}</p></div>
    <span className="event-duration">{t(event ? 'eventToday' : 'eventSchedule')}</span>
  </section>;
}

export function CounterGuide() {
  const { t } = useTranslation();
  return <section className="counter-panel" aria-label={t('counterHeading')}><div><strong>{t('counterHeading')}</strong><small>{t('counterBonus')}</small></div><p><span>{t('heavy')}</span><b>→</b><span>{t('ranged')}</span><b>→</b><span>{t('scout')}</span><b>→</b><span>{t('heavy')}</span></p></section>;
}

export function AttackOptions() {
  const { t } = useTranslation();
  const { game, selected, cell } = useGame();
  const unit = game.units.find(u => u.id === selected);
  if (!unit || game.result) return null;
  const targets = game.units.filter(u => u.team !== unit.team && distance(unit, u) <= unit.range);
  if (!targets.length) return null;
  return <section className="attack-options" aria-label={t('attackOptions')}><h3>{t('attackOptions')}</h3><div>{targets.map(target => {
    const preview = damagePreview(game, unit, target);
    return <button key={target.id} onClick={() => cell(target)} disabled={unit.ap < unit.attackCost}>
      <span><strong>{t(target.role)}</strong><small>{String.fromCharCode(65 + target.x)}{target.y + 1} · {unit.attackCost} AP</small></span>
      <span className="attack-value"><strong>{t('previewDamage', { damage: preview.damage })}</strong><small>{t(preview.blocked ? 'guardStatus' : preview.advantage ? 'advantageLabel' : 'neutralLabel')}</small></span>
      <b>{t('attackAction')} →</b>
    </button>;
  })}</div></section>;
}

export function BattleFeedback() {
  const { t } = useTranslation();
  const feedback = useGame(s => s.game.feedback);
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!feedback) return; setVisible(true); const timer = setTimeout(() => setVisible(false), 3200); return () => clearTimeout(timer); }, [feedback]);
  if (!feedback || !visible) return null;
  const values = { ...feedback.values };
  for (const key of ['team', 'role']) if (typeof values[key] === 'string') values[key] = t(String(values[key]));
  if (typeof values.event === 'string') values.event = t(`event_${values.event}`);
  return <div key={feedback.id} className={`battle-toast ${feedback.key === 'logGuard' ? 'skill-toast' : ''}`} role="status"><span>{t('breaking')}</span><p>{t(feedback.key, values)}</p></div>;
}
