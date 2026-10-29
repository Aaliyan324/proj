import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { fetchSettings, buildWhatsAppLink } from '../services/apiService';
import { prefersReducedMotion, scrollToTarget } from '../lib/motion';

interface HeroCarouselProps {
  onSearch: (criteria: {
    checkIn: string;
    checkOut: string;
    category: string;
    guests: number;
  }) => void;
  onQuickBook: () => void;
}

const SLIDES = [
  {
    image: "/images/room_suite_king.jpg",
    subtitle: "WELCOME TO GRAND TRAVELA HOTEL & RESORT",
    title: "Executive Luxury Suites & Genuine Hospitality",
    desc: "Experience premier comfort featuring luxury king bedding, full-height padded velvet wall accents, polished marble floors, and 24/7 guest service."
  },
  {
    image: "/images/room_suite_double.jpg",
    subtitle: "MODERN ROOMS & FAMILY ACCOMMODATION",
    title: "20 Dedicated Rooms with Live Reception Availability",
    desc: "Spacious twin and double suites appointed with contemporary wall slats, wardrobe storage, climate control, and ensuite bathrooms."
  },
  {
    image: "/images/room_suite_lounge.jpg",
    subtitle: "INSTANT WHATSAPP BOOKING & CASH PAYMENT",
    title: "Direct Hotel Reservations & Cash on Arrival",
    desc: "Reserve your stay directly with hotel reception on WhatsApp. No online transactions needed — convenient cash payment upon check-in."
  }
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onSearch, onQuickBook }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Search state
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(threeDaysLater);
  const [category, setCategory] = useState('all');
  const [guests, setGuests] = useState(2);

  useEffect(() => {
    fetchSettings().then(s => setWhatsappNumber(s.whatsapp_number));
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  // Slide entrance: text reveal + gentle image zoom. Re-runs per slide change,
  // scoped to this component and cleaned up automatically by useGSAP.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        `.hero-slide[data-slide="${currentSlide}"] .hero-content > *`,
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12, overwrite: true }
      );
      gsap.fromTo(
        `.hero-slide[data-slide="${currentSlide}"] img`,
        { scale: 1.08 },
        { scale: 1, duration: 6, ease: 'power1.out', overwrite: 'auto' }
      );
    },
    { dependencies: [currentSlide], scope: rootRef }
  );

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      checkIn,
      checkOut,
      category,
      guests
    });

    const roomsSection = document.getElementById('rooms');
    if (roomsSection) {
      scrollToTarget(roomsSection, { offset: -20 });
    }
  };

  const handleWhatsAppInquiry = () => {
    const link = buildWhatsAppLink(whatsappNumber);
    window.open(link, '_blank');
  };

  return (
    <div id="home" ref={rootRef} className="relative w-full overflow-hidden bg-gray-900">
      {/* Carousel Container */}
      <div className="relative h-[620px] lg:h-[720px] w-full">
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            data-slide={index}
            className={`hero-slide absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image using user-provided hotel room photo */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            {/* Dark Elegant Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-blue-950/70 to-black/50" />

            {/* Slide Content */}
            <div className="absolute inset-0 flex items-center justify-center text-center px-4 lg:px-12">
              <div className="hero-content max-w-4xl mx-auto text-white mt-[-30px]">
                <div className="inline-block mb-3 px-4 py-1.5 rounded-full bg-blue-900/60 border border-amber-400/50 backdrop-blur-sm">
                  <span className="text-amber-300 text-xs lg:text-sm font-semibold tracking-widest uppercase">
                    <i className="fa fa-hotel me-2"></i>
                    {slide.subtitle}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-md">
                  {slide.title}
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-blue-100/90 max-w-2xl mx-auto mb-8 leading-relaxed font-light">
                  {slide.desc}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={handleWhatsAppInquiry}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-sm uppercase tracking-wider flex items-center space-x-2"
                  >
                    <i className="fab fa-whatsapp text-lg"></i>
                    <span>Contact on WhatsApp</span>
                  </button>

                  <a
                    href="#rooms"
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/40 font-semibold px-8 py-3.5 rounded-full backdrop-blur-sm transition-all text-sm uppercase tracking-wider flex items-center space-x-2"
                  >
                    <i className="fa fa-bed"></i>
                    <span>View 20 Rooms</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Pill Arrows */}
        <button
          onClick={handlePrev}
          aria-label="Previous Slide"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-hotel-primary/90 hover:bg-hotel-primary text-white pl-4 pr-6 py-4 rounded-r-full shadow-xl transition-all hidden md:flex items-center justify-center"
        >
          <i className="fa fa-chevron-left text-lg"></i>
        </button>

        <button
          onClick={handleNext}
          aria-label="Next Slide"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-hotel-primary/90 hover:bg-hotel-primary text-white pr-4 pl-6 py-4 rounded-l-full shadow-xl transition-all hidden md:flex items-center justify-center"
        >
          <i className="fa fa-chevron-right text-lg"></i>
        </button>

        {/* Carousel Slide Indicators */}
        <div className="absolute bottom-28 lg:bottom-24 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 transition-all rounded-full ${
                i === currentSlide ? 'w-8 bg-amber-400' : 'w-2.5 bg-white/50 hover:bg-white'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating Availability Search Bar */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 -mt-16 lg:-mt-14 mb-8">
        <div className="bg-hotel-primary/95 backdrop-blur-md rounded-3xl lg:rounded-full p-4 lg:p-5 shadow-2xl border border-blue-800/80">
          <form onSubmit={handleSubmitSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Check-In */}
            <div className="bg-white/10 hover:bg-white/15 rounded-2xl lg:rounded-full px-4 py-2.5 border border-white/20 transition-all">
              <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-0.5">
                <i className="fa fa-calendar-alt me-1.5"></i> Check-In Date
              </label>
              <input
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
                required
              />
            </div>

            {/* Check-Out */}
            <div className="bg-white/10 hover:bg-white/15 rounded-2xl lg:rounded-full px-4 py-2.5 border border-white/20 transition-all">
              <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-0.5">
                <i className="fa fa-calendar-check me-1.5"></i> Check-Out Date
              </label>
              <input
                type="date"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
                required
              />
            </div>

            {/* Guests */}
            <div className="bg-white/10 hover:bg-white/15 rounded-2xl lg:rounded-full px-4 py-2.5 border border-white/20 transition-all">
              <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-0.5">
                <i className="fa fa-user-friends me-1.5"></i> Guests
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer [&>option]:text-gray-900"
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests (Family)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold py-3.5 px-4 rounded-2xl lg:rounded-full shadow-lg transition-all flex items-center justify-center space-x-2 text-sm uppercase tracking-wider cursor-pointer"
              >
                <i className="fa fa-search"></i>
                <span>Check Availability</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
