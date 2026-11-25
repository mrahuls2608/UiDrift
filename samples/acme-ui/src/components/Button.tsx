import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold',
  secondary: 'bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-full text-sm',
  ghost: 'bg-transparent text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-100',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={`${variants[variant]} ${className}`} {...props} />;
}

export function ActionBar() {
  return (
    <div className="flex gap-3 p-4">
      <button className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-semibold">Save</button>
      <button className="bg-violet-600 text-white px-8 py-3.5 rounded-xl text-lg font-bold shadow-lg">Book a demo</button>
      <button className="bg-sky-500 text-white px-[18px] py-[9px] rounded-lg text-[15px] focus:outline-none">Choose Pro</button>
      <a href="/pricing" className="text-blue-500 text-[13px] underline">See pricing</a>
    </div>
  );
}
