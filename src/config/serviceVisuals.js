import { Wrench, Zap, Snowflake, Hammer, Paintbrush, Sparkles, Truck, Droplet } from 'lucide-react'

// المفاتيح تطابق حقل icon الراجع من الباكند لكل خدمة (services.icon)
export const serviceVisuals = {
  zap: { Icon: Zap, gradient: 'linear-gradient(137deg, #f19035 0%, #fdb78e 50%, #dac7c0 100%)' },
  droplet: { Icon: Droplet, gradient: 'linear-gradient(137deg, #263056 0%, #dac7c0 50%, #fdb78e 100%)' },
  snowflake: { Icon: Snowflake, gradient: 'linear-gradient(137deg, #263056 0%, #dac7c0 50%, #aa8173 100%)' },
  hammer: { Icon: Hammer, gradient: 'linear-gradient(137deg, #aa8173 0%, #fdb78e 50%, #f19035 100%)' },
  paintbrush: { Icon: Paintbrush, gradient: 'linear-gradient(137deg, #fdb78e 0%, #dac7c0 50%, #aa8173 100%)' },
  sparkles: { Icon: Sparkles, gradient: 'linear-gradient(137deg, #dac7c0 0%, #fdb78e 50%, #263056 100%)' },
  truck: { Icon: Truck, gradient: 'linear-gradient(137deg, #aa8173 0%, #263056 50%, #f19035 100%)' },
}

export const defaultServiceVisual = {
  Icon: Wrench,
  gradient: 'linear-gradient(137deg, #263056 0%, #dac7c0 50%, #fdb78e 100%)',
}
