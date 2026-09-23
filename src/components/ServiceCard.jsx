import { motion } from 'motion/react'
import { Link } from 'react-router'
import { 
  Snowflake, 
  Zap, 
  Droplet, 
  Sparkles, 
  Paintbrush, 
  Hammer, 
  ArrowLeft 
} from 'lucide-react'

// تخصيص خلفيات شفافة وهادئة جداً لكل بطاقة وأيقونتها
const serviceConfig = {
  'تكييف وتبريد': { 
    Icon: Snowflake, 
    cardBg: 'bg-cyan-50/60 hover:bg-cyan-50/90 border-cyan-100/60', 
    iconBg: 'bg-cyan-100/80', 
    color: 'text-cyan-700' 
  },
  'كهرباء': { 
    Icon: Zap, 
    cardBg: 'bg-amber-50/60 hover:bg-amber-50/90 border-amber-100/60', 
    iconBg: 'bg-amber-100/80', 
    color: 'text-amber-700' 
  },
  'سباكة': { 
    Icon: Droplet, 
    cardBg: 'bg-blue-50/60 hover:bg-blue-50/90 border-blue-100/60', 
    iconBg: 'bg-blue-100/80', 
    color: 'text-blue-700' 
  },
  'تنظيف': { 
    Icon: Sparkles, 
    cardBg: 'bg-indigo-50/60 hover:bg-indigo-50/90 border-indigo-100/60', 
    iconBg: 'bg-indigo-100/80', 
    color: 'text-indigo-700' 
  },
  'دهان وديكور': { 
    Icon: Paintbrush, 
    cardBg: 'bg-rose-50/60 hover:bg-rose-50/90 border-rose-100/60', 
    iconBg: 'bg-rose-100/80', 
    color: 'text-rose-700' 
  },
  'نجارة': { 
    Icon: Hammer, 
    cardBg: 'bg-orange-50/60 hover:bg-orange-50/90 border-orange-100/60', 
    iconBg: 'bg-orange-100/80', 
    color: 'text-orange-700' 
  },
}

function ServiceCard({ to, title, delay = 0 }) {
  const config = serviceConfig[title] || { 
    Icon: Snowflake, 
    cardBg: 'bg-slate-50/60 hover:bg-slate-50/90 border-slate-100/60', 
    iconBg: 'bg-slate-100/80', 
    color: 'text-slate-700' 
  }
  const IconComponent = config.Icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        to={to}
        className={`flex flex-col items-center justify-between rounded-2xl p-5 text-center no-underline border backdrop-blur-md shadow-sm transition-all duration-300 h-[150px] ${config.cardBg}`}
      >
        {/* دائرة الأيقونة بشفافية ولون ناعم */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg} ${config.color} transition-transform duration-300 group-hover:scale-110`}>
          <IconComponent size={22} strokeWidth={2} aria-hidden="true" />
        </div>

        {/* عنوان الخدمة */}
        <span className="text-sm font-bold text-slate-800 tracking-tight">
          {title}
        </span>

        {/* سهم الانتقال الصغير في الأسفل */}
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-slate-500 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
          <ArrowLeft size={13} className="rtl:rotate-180" aria-hidden="true" />
        </div>
      </Link>
    </motion.div>
  )
}

export default ServiceCard