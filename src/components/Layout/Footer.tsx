
import { Facebook, Instagram, MapPin, MessageCircle, ChevronUp, Music } from 'lucide-react';
import { useState, useEffect } from 'react';

export const Footer = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-[#f0f8ff] pt-12 pb-24 md:pb-12 border-t border-blue-100 mt-auto relative font-sans text-slate-700">
            <div className="container mx-auto px-4">
                {/* Title */}
                <h2 className="text-center text-slate-600 text-lg md:text-xl font-normal mb-10 w-full border-b-0">
                    SYSTEC FDC COORPORATION S.A.C.
                </h2>

                <div className="flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
                    {/* Map Section */}
                    <div className="w-full lg:w-1/3 flex justify-center lg:justify-start">
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 inline-block">
                            { }
                            <div className="w-[300px] h-[150px] bg-slate-100 rounded relative overflow-hidden flex items-center justify-center text-slate-400">
                                <MapPin size={40} className="text-red-500 mb-2 absolute top-10" />
                                <span className="text-xs absolute bottom-2 bg-white/80 px-2 py-1 rounded">Ver mapa en Google</span>
                                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Google_Maps_Logo_2020.svg/1024px-Google_Maps_Logo_2020.svg.png')] opacity-10 bg-center bg-no-repeat bg-contain"></div>
                            </div>
                        </div>


                    </div>

                    {/* Contact Info */}
                    <div className="w-full lg:w-1/3 text-sm md:text-base space-y-3 text-center lg:text-left">
                        <p className="font-medium text-slate-800">
                            <span className="font-bold text-slate-600">RUC:</span> 20611939770 <span className="hidden sm:inline">|</span> <span className="block sm:inline mt-1 sm:mt-0"><span className="font-bold text-slate-600">Correo:</span> systecfdc@gmail.com</span>
                        </p>

                        <div className="flex flex-wrap justify-center lg:justify-start gap-x-2 gap-y-1">
                            <span><span className="font-bold text-slate-600">Ventas:</span> 973 736 386</span>
                            <span className="hidden sm:inline">|</span>
                            <span><span className="font-bold text-slate-600">Servicio Técnico:</span> 973 736 386</span>
                        </div>

                        <p>
                            <span className="font-bold text-slate-600">Dirección:</span> MZA. A LOTE. 1 URB. INGENIERIA, Oficina Interior<br />
                            Jesús Nazareno, Huamanga, Ayacucho
                        </p>

                        {/* Social Icons */}
                        <div className="flex justify-center lg:justify-start gap-4 mt-6">
                            <a href="https://www.facebook.com/share/1Gbz6p5FaW/" className="w-10 h-10 bg-[#3b5998] text-white rounded-full flex items-center justify-center hover:opacity-90 transition shadow-sm" target="_blank" rel="noopener noreferrer">
                                <Facebook size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white rounded-full flex items-center justify-center hover:opacity-90 transition shadow-sm">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:opacity-90 transition shadow-sm">
                                <Music size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Logo Section */}
                    <div className="w-full lg:w-1/3 flex flex-col items-center justify-center">
                        <div>
                            <img src="../images/systec_logo.png" alt="" />
                        </div>
                        <div className="text-center text-slate-500 text-sm">
                            <p>© SYSTEC FDC COORPORATION S.A.C. - 2026</p>
                            <p>Todos los derechos reservados</p>
                            <p>Desarrollado por: <a href="https://www.linkedin.com/in/luis-figueroa-arce-4185b8214/" target="_blank" rel="noopener noreferrer">Figueroa Arce Luis</a></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Buttons */}
            {/* WhatsApp - Left */}
            <a
                href="https://wa.me/51973736386"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 left-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center"
                title="WhatsApp"
            >
                <MessageCircle size={32} fill="white" className="text-[#25D366]" />
            </a>

            {/* Scroll Top - Right */}
            <button
                onClick={scrollToTop}
                className={`fixed bottom-6 right-6 z-50 bg-[#0088cc] text-white p-3 rounded-full shadow-lg hover:bg-[#0077b3] transition-all duration-300 transform ${showScrollTop ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                title="Volver arriba"
            >
                <ChevronUp size={28} />
            </button>
        </footer>
    );
};
