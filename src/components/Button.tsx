import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'px-4 py-2 rounded-lg min-h-[44px] font-medium transition disabled:opacity-50 cursor-pointer';
  const variants = {
    primary: 'bg-blue-800 hover:bg-blue-900 text-white',
    secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
