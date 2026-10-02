import './style.css';
export const metadata={title:'Pulse — prywatna analityka',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="pl"><body className="min-h-screen bg-slate-50 font-sans text-[15px] text-slate-800 antialiased [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#1664d8]">{children}</body></html>;}
