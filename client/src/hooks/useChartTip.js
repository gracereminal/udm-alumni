import { useCallback, useRef, useState } from 'react';

/** Hover tooltip for the dashboard charts (bars and donut slices). Returns the values the chart views expect. */
export default function useChartTip() {
  const chartsRef = useRef(null);
  const [tip, setTip] = useState(null);

  const showTip = useCallback((e, title, value) => {
    const el = chartsRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const s = r.width / el.offsetWidth || 1;
    setTip({ title, value, x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s });
  }, []);
  const hideTip = useCallback(() => setTip((t) => (t ? null : t)), []);
  const tipH = useCallback((title, value) => ({ onTipMove: (e) => showTip(e, title, value), onTipLeave: hideTip }), [showTip, hideTip]);

  /** Donut hover handler: finds the slice under the cursor. `ring` = [inner, outer] radius in a 172px-wide donut. */
  const donutMove = useCallback((slices, mode = 'ring') => (e) => {
    const t = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (t.left + t.width / 2);
    const dy = e.clientY - (t.top + t.height / 2);
    if (mode === 'ring') {
      const rad = (Math.hypot(dx, dy) * 172) / t.width;
      if (rad < 62 || rad > 86) { hideTip(); return; }
    } else {
      const r = Math.hypot(dx, dy);
      if (r < t.width / 2 - 24 || r > t.width / 2) { hideTip(); return; }
    }
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const sl = slices.find((x) => deg / 3.6 <= x.end) || slices[slices.length - 1];
    if (sl) showTip(e, sl.title, sl.value);
  }, [showTip, hideTip]);

  const vals = {
    chartsRef, hideTip,
    tipShow: !!tip, tipTitle: tip ? tip.title : '', tipValue: tip ? tip.value : '',
    tipX: tip ? `${tip.x}px` : '0px', tipY: tip ? `${tip.y}px` : '0px',
  };
  return { tipH, donutMove, vals };
}
