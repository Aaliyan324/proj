import React, { useState, useEffect } from 'react';
import { FoodItem, fetchFood, fetchSettings, buildFoodWhatsAppLink } from '../services/apiService';
import { Reveal } from '../lib/Reveal';

export const DiningSection: React.FC = () => {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFood = async () => {
    try {
      const [foodData, settingsData] = await Promise.all([
        fetchFood(),
        fetchSettings()
      ]);
      setFoodItems(foodData);
      setWhatsappNumber(settingsData.whatsapp_number);
    } catch (err) {
      console.error('Error loading food:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFood();
    // Poll every 10 seconds for real-time menu updates
    const interval = setInterval(loadFood, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderWhatsApp = (foodName: string) => {
    const link = buildFoodWhatsAppLink(whatsappNumber, foodName);
    window.open(link, '_blank');
  };

  return (
    <section id="dining" className="py-20 bg-white">
      <Reveal stagger={0.12}>
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h5 className="section-title text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
            Hotel Kitchen &amp; Dining
          </h5>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
            Fresh Food &amp; Daily Specials
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Delicious dishes freshly prepared by our in-house culinary staff. Check daily service hours and availability below, or contact room service directly via WhatsApp.
          </p>
        </div>

        {/* Loading State */}
        {loading && foodItems.length === 0 ? (
          <div className="text-center py-16">
            <i className="fa fa-spinner fa-spin text-3xl text-hotel-primary mb-3"></i>
            <p className="text-sm text-gray-500">Loading fresh dining menu...</p>
          </div>
        ) : foodItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl max-w-md mx-auto p-6 border border-gray-200">
            <i className="fa fa-utensils text-3xl text-gray-400 mb-3"></i>
            <h4 className="text-base font-bold text-gray-700 mb-1">Menu Items Being Prepared</h4>
            <p className="text-xs text-gray-500">
              Our culinary team is updating today&apos;s specials. Inquire via WhatsApp for custom orders.
            </p>
          </div>
        ) : (
          /* Food Items Grid (Pure Food Display with Zero Pricing) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {foodItems.map((food) => {
              const isAvailable = Boolean(food.is_available === 1 || food.is_available === true);

              return (
                <div
                  key={food.id}
                  className="card-hover-elevate bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300 border border-gray-100 flex flex-col group"
                >
                  {/* Food Thumbnail */}
                  <div className="h-48 w-full relative overflow-hidden bg-gray-100">
                    <img
                      src={food.thumbnail}
                      alt={food.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.src = '/uploads/img_1791024997069_val5a6.jpeg';
                      }}
                    />

                    {/* Availability Badge */}
                    <div className="absolute top-3 right-3">
                      {isAvailable ? (
                        <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center space-x-1 border border-emerald-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>Available</span>
                        </span>
                      ) : (
                        <span className="bg-gray-800/90 backdrop-blur-sm text-gray-200 text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                          <i className="fa fa-clock text-[9px]"></i>
                          <span>Not Available</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Food Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-hotel-primary transition-colors">
                        {food.name}
                      </h3>

                      {/* Availability Time Window: e.g. 12:00 PM – 10:00 PM */}
                      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs mb-4">
                        <span className="text-blue-900 font-bold block mb-0.5">
                          <i className="fa fa-clock text-amber-500 me-1.5"></i>
                          Service Hours
                        </span>
                        <span className="text-gray-700 font-semibold">
                          Available: {food.available_from} &ndash; {food.available_until}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Inquire / Order CTA */}
                    <div className="pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleOrderWhatsApp(food.name)}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-bold transition-all shadow flex items-center justify-center space-x-2 cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
                        }`}
                        title="Contact Kitchen via WhatsApp"
                      >
                        <i className="fab fa-whatsapp text-sm"></i>
                        <span>{isAvailable ? 'Inquire via WhatsApp' : 'Check Service Status'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </Reveal>
    </section>
  );
};
