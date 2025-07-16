interface BadgeDisplayProps {
  icon: React.ReactNode;
  title: string;
  earned: boolean;
  color: string;
}

export default function BadgeDisplay({ icon, title, earned, color }: BadgeDisplayProps) {
  return (
    <div className="text-center">
      <div 
        className={`w-12 h-12 ${earned ? `bg-gradient-to-r ${color}` : 'bg-gray-200'} rounded-full flex items-center justify-center mx-auto mb-2`}
      >
        {icon}
      </div>
      <p className={`text-xs ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
        {title}
      </p>
    </div>
  );
}
