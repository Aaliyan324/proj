import React, { useState, useEffect, useRef } from 'react';
import { 
  HotelRoom, 
  FoodItem, 
  HotelSettings,
  FacilitySection,
  DynamicGalleryItem,
  fetchRooms, 
  fetchFood, 
  fetchSettings, 
  fetchAdminFacilities,
  updateFacility,
  fetchAdminGallery,
  addRoom,
  updateRoom,
  deleteRoom,
  updateRoomAvailabilityStatus,
  setBulkRoomAvailability, 
  addGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  addFoodItem, 
  updateFoodItem, 
  deleteFoodItem, 
  uploadThumbnail, 
  updateSettings,
  changeAdminPassword,
  adminLogout,
  getAdminUser,
  buildWhatsAppLink
} from '../services/apiService';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'facilities' | 'gallery' | 'food' | 'settings' | 'security'>('rooms');
  
  // Data States
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [facilities, setFacilities] = useState<FacilitySection[]>([]);
  const [galleryItems, setGalleryItems] = useState<DynamicGalleryItem[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [settings, setSettings] = useState<HotelSettings>({ whatsapp_number: '' });
  
  // Loading & Toast States
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [loadingFood, setLoadingFood] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // -------------------------------------------------------------
  // ROOM STATE & FORMS
  // -------------------------------------------------------------
  const [roomFilter, setRoomFilter] = useState<'all' | 'Available' | 'Occupied' | 'Reserved' | 'Maintenance'>('all');
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [roomFormMode, setRoomFormMode] = useState<'add' | 'edit'>('add');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [roomTitleInput, setRoomTitleInput] = useState('');
  const [roomTypeInput, setRoomTypeInput] = useState('Deluxe King Suite');
  const [roomDescInput, setRoomDescInput] = useState('');
  const [roomImageInput, setRoomImageInput] = useState('/images/02-room-01.jpg');
  const [roomStatusInput, setRoomStatusInput] = useState<'Available' | 'Occupied' | 'Reserved' | 'Maintenance'>('Available');
  const [roomOrderInput, setRoomOrderInput] = useState('1');
  const [roomPublishedInput, setRoomPublishedInput] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);

  // -------------------------------------------------------------
  // FACILITY (ENTRANCE & RECEPTION) STATE
  // -------------------------------------------------------------
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [facilityTitle, setFacilityTitle] = useState('');
  const [facilityDesc, setFacilityDesc] = useState('');
  const [facilityImage, setFacilityImage] = useState('');
  const [facilityOrder, setFacilityOrder] = useState('1');
  const [facilityPublished, setFacilityPublished] = useState(true);
  const [savingFacility, setSavingFacility] = useState(false);

  // -------------------------------------------------------------
  // DYNAMIC GALLERY STATE & FORMS
  // -------------------------------------------------------------
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [galleryFormOpen, setGalleryFormOpen] = useState(false);
  const [galleryFormMode, setGalleryFormMode] = useState<'add' | 'edit'>('add');
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [galleryCategory, setGalleryCategory] = useState<string>('scenery');
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryRoomNumber, setGalleryRoomNumber] = useState('');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryImage, setGalleryImage] = useState('/images/02-room-01.jpg');
  const [galleryOrder, setGalleryOrder] = useState('1');
  const [galleryPublished, setGalleryPublished] = useState(true);
  const [savingGallery, setSavingGallery] = useState(false);

  // -------------------------------------------------------------
  // FOOD FORM STATES (Strictly NO price!)
  // -------------------------------------------------------------
  const [foodFormMode, setFoodFormMode] = useState<'add' | 'edit'>('add');
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [foodThumbnail, setFoodThumbnail] = useState('/uploads/img_1791024997069_val5a6.jpeg');
  const [foodAvailableFrom, setFoodAvailableFrom] = useState('12:00 PM');
  const [foodAvailableUntil, setFoodAvailableUntil] = useState('10:00 PM');
  const [foodIsAvailable, setFoodIsAvailable] = useState(true);
  const [submittingFood, setSubmittingFood] = useState(false);

  // -------------------------------------------------------------
  // SETTINGS & PASSWORD
  // -------------------------------------------------------------
  const [whatsappInput, setWhatsappInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const adminUser = getAdminUser();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoadingRooms(true);
    setLoadingFacilities(true);
    setLoadingGallery(true);
    setLoadingFood(true);
    try {
      const [roomsData, facilitiesData, galleryData, foodData, settingsData] = await Promise.all([
        fetchRooms(),
        fetchAdminFacilities(),
        fetchAdminGallery(),
        fetchFood(),
        fetchSettings()
      ]);
      setRooms(roomsData);
      setFacilities(facilitiesData);
      setGalleryItems(galleryData);
      setFoodItems(foodData);
      setSettings(settingsData);
      setWhatsappInput(settingsData.whatsapp_number || '');
    } catch (err) {
      showToast('Error loading administrative data', 'error');
    } finally {
      setLoadingRooms(false);
      setLoadingFacilities(false);
      setLoadingGallery(false);
      setLoadingFood(false);
    }
  };

  // Generic Image Uploader
  const handleFileUpload = async (file: File, onSuccess: (url: string) => void) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP)', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image size must be less than 15MB', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const url = await uploadThumbnail(file);
      onSuccess(url);
      showToast('Photograph uploaded and verified successfully');
    } catch (err: any) {
      showToast('Image upload failed: ' + (err.message || 'Error'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // ==========================================
  // ROOM AVAILABILITY & MANAGEMENT HANDLERS
  // ==========================================
  const handleUpdateRoomStatus = async (roomId: string, newStatus: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance') => {
    setRooms(prev => prev.map(r => r.id === roomId ? { 
      ...r, 
      status: newStatus, 
      is_available: newStatus === 'Available' ? 1 : 0 
    } : r));

    const updated = await updateRoomAvailabilityStatus(roomId, newStatus);
    if (updated) {
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));
      showToast(`${updated.room_number} status set to "${newStatus}"`);
    } else {
      loadAllData();
      showToast('Failed to update room status', 'error');
    }
  };

  const handleBulkStatus = async (status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance') => {
    const updated = await setBulkRoomAvailability(status);
    if (updated.length > 0) {
      setRooms(updated);
      showToast(`All rooms updated to "${status}"`);
    } else {
      showToast('Bulk update failed', 'error');
    }
  };

  const resetRoomForm = () => {
    setRoomFormMode('add');
    setEditingRoomId(null);
    const nextNum = rooms.length + 1;
    const formatted = nextNum < 10 ? `Room 0${nextNum}` : `Room ${nextNum}`;
    setRoomNumberInput(formatted);
    setRoomTitleInput(`${formatted} Luxury Suite`);
    setRoomTypeInput('Deluxe King Suite');
    setRoomDescInput(`Comfortable ${formatted} featuring climate control, ensuite luxury bathroom, and 24/7 guest service.`);
    setRoomImageInput('/images/02-room-01.jpg');
    setRoomStatusInput('Available');
    setRoomOrderInput(String(nextNum));
    setRoomPublishedInput(true);
    setRoomFormOpen(false);
  };

  const handleOpenAddRoom = () => {
    resetRoomForm();
    setRoomFormOpen(true);
  };

  const handleEditRoomClick = (room: HotelRoom) => {
    setRoomFormMode('edit');
    setEditingRoomId(room.id);
    setRoomNumberInput(room.room_number);
    setRoomTitleInput(room.title || room.room_number);
    setRoomTypeInput(room.room_type || 'Deluxe Room');
    setRoomDescInput(room.description || '');
    setRoomImageInput(room.image_url);
    const effectiveStatus = (['Available', 'Occupied', 'Reserved', 'Maintenance'].includes(String(room.status)) 
      ? String(room.status) 
      : (room.is_available ? 'Available' : 'Occupied')) as any;
    setRoomStatusInput(effectiveStatus);
    setRoomOrderInput(String(room.display_order || 1));
    setRoomPublishedInput(Boolean(room.is_published !== 0 && room.is_published !== false));
    setRoomFormOpen(true);
    const formElem = document.getElementById('room-form-card');
    if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumberInput.trim()) {
      showToast('Room number is required', 'error');
      return;
    }
    setSavingRoom(true);
    try {
      if (roomFormMode === 'add') {
        const created = await addRoom({
          room_number: roomNumberInput.trim(),
          title: roomTitleInput.trim() || roomNumberInput.trim(),
          room_type: roomTypeInput.trim(),
          description: roomDescInput.trim(),
          image_url: roomImageInput,
          status: roomStatusInput,
          display_order: Number(roomOrderInput) || (rooms.length + 1),
          is_published: roomPublishedInput ? 1 : 0
        });
        if (created) {
          setRooms(prev => [...prev, created].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)));
          showToast(`${created.room_number} added to room sequence successfully`);
          resetRoomForm();
        }
      } else if (editingRoomId) {
        const updated = await updateRoom(editingRoomId, {
          room_number: roomNumberInput.trim(),
          title: roomTitleInput.trim() || roomNumberInput.trim(),
          room_type: roomTypeInput.trim(),
          description: roomDescInput.trim(),
          image_url: roomImageInput,
          status: roomStatusInput,
          display_order: Number(roomOrderInput) || 0,
          is_published: roomPublishedInput ? 1 : 0
        });
        if (updated) {
          setRooms(prev => prev.map(r => r.id === editingRoomId ? updated : r).sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0)));
          showToast(`${updated.room_number} updated successfully`);
          resetRoomForm();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving room', 'error');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (room: HotelRoom) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${room.room_number}"? All saved details and availability for this room will be deleted.`)) {
      return;
    }
    const success = await deleteRoom(room.id);
    if (success) {
      setRooms(prev => prev.filter(r => r.id !== room.id));
      showToast(`${room.room_number} removed from inventory`);
      if (editingRoomId === room.id) resetRoomForm();
    } else {
      showToast(`Failed to delete ${room.room_number}`, 'error');
    }
  };

  // ==========================================
  // FACILITY MANAGEMENT HANDLERS (Entrance & Reception)
  // ==========================================
  const handleEditFacilityClick = (fac: FacilitySection) => {
    setEditingFacilityId(fac.id);
    setFacilityTitle(fac.title);
    setFacilityDesc(fac.description);
    setFacilityImage(fac.image_url);
    setFacilityOrder(String(fac.display_order));
    setFacilityPublished(Boolean(fac.is_published !== 0 && fac.is_published !== false));
    const formElem = document.getElementById('facility-edit-form');
    if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacilityId) return;
    setSavingFacility(true);
    try {
      const updated = await updateFacility(editingFacilityId, {
        title: facilityTitle.trim(),
        description: facilityDesc.trim(),
        image_url: facilityImage,
        display_order: Number(facilityOrder) || 1,
        is_published: facilityPublished ? 1 : 0
      });
      if (updated) {
        setFacilities(prev => prev.map(f => f.id === editingFacilityId ? updated : f));
        showToast(`"${updated.title}" updated successfully`);
        setEditingFacilityId(null);
      } else {
        showToast('Failed to save facility changes', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving facility section', 'error');
    } finally {
      setSavingFacility(false);
    }
  };

  // ==========================================
  // DYNAMIC GALLERY MANAGEMENT HANDLERS
  // ==========================================
  const resetGalleryForm = () => {
    setGalleryFormMode('add');
    setEditingGalleryId(null);
    setGalleryCategory('scenery');
    setGalleryTitle('');
    setGalleryRoomNumber('');
    setGalleryDesc('');
    setGalleryImage('/images/02-room-01.jpg');
    setGalleryOrder(String(galleryItems.length + 1));
    setGalleryPublished(true);
    setGalleryFormOpen(false);
  };

  const handleEditGalleryClick = (item: DynamicGalleryItem) => {
    setGalleryFormMode('edit');
    setEditingGalleryId(item.id);
    setGalleryCategory(item.category as any);
    setGalleryTitle(item.title);
    setGalleryRoomNumber(item.room_number || '');
    setGalleryDesc(item.description);
    setGalleryImage(item.image_url);
    setGalleryOrder(String(item.display_order));
    setGalleryPublished(Boolean(item.is_published !== 0 && item.is_published !== false));
    setGalleryFormOpen(true);
    const formElem = document.getElementById('gallery-form-card');
    if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryTitle.trim()) {
      showToast('Gallery title is required', 'error');
      return;
    }
    setSavingGallery(true);
    try {
      if (galleryFormMode === 'add') {
        const created = await addGalleryItem({
          category: galleryCategory,
          title: galleryTitle.trim(),
          room_number: galleryCategory === 'rooms' ? galleryRoomNumber.trim() : null,
          description: galleryDesc.trim(),
          image_url: galleryImage,
          display_order: Number(galleryOrder) || (galleryItems.length + 1),
          is_published: galleryPublished ? 1 : 0
        });
        if (created) {
          setGalleryItems(prev => [...prev, created].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
          showToast(`"${created.title}" added to gallery`);
          resetGalleryForm();
        }
      } else if (editingGalleryId) {
        const updated = await updateGalleryItem(editingGalleryId, {
          category: galleryCategory,
          title: galleryTitle.trim(),
          room_number: galleryCategory === 'rooms' ? galleryRoomNumber.trim() : null,
          description: galleryDesc.trim(),
          image_url: galleryImage,
          display_order: Number(galleryOrder) || 0,
          is_published: galleryPublished ? 1 : 0
        });
        if (updated) {
          setGalleryItems(prev => prev.map(item => item.id === editingGalleryId ? updated : item).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
          showToast(`"${updated.title}" updated in gallery`);
          resetGalleryForm();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving gallery item', 'error');
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGalleryItem = async (item: DynamicGalleryItem) => {
    if (!window.confirm(`Are you sure you want to remove "${item.title}" from the gallery?`)) {
      return;
    }
    const success = await deleteGalleryItem(item.id);
    if (success) {
      setGalleryItems(prev => prev.filter(i => i.id !== item.id));
      showToast(`"${item.title}" removed from gallery`);
      if (editingGalleryId === item.id) resetGalleryForm();
    } else {
      showToast('Failed to delete gallery item', 'error');
    }
  };

  // ==========================================
  // FOOD MANAGEMENT HANDLERS (NO PRICE)
  // ==========================================
  const resetFoodForm = () => {
    setFoodFormMode('add');
    setEditingFoodId(null);
    setFoodName('');
    setFoodThumbnail('/uploads/img_1791024997069_val5a6.jpeg');
    setFoodAvailableFrom('12:00 PM');
    setFoodAvailableUntil('10:00 PM');
    setFoodIsAvailable(true);
  };

  const handleEditFoodClick = (item: FoodItem) => {
    setFoodFormMode('edit');
    setEditingFoodId(item.id);
    setFoodName(item.name);
    setFoodThumbnail(item.thumbnail);
    setFoodAvailableFrom(item.available_from);
    setFoodAvailableUntil(item.available_until);
    setFoodIsAvailable(Boolean(item.is_available === 1 || item.is_available === true));
    setActiveTab('food');
    const container = document.getElementById('food-form-section');
    if (container) container.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) {
      showToast('Food Name is required', 'error');
      return;
    }
    setSubmittingFood(true);
    try {
      if (foodFormMode === 'add') {
        const added = await addFoodItem({
          name: foodName.trim(),
          thumbnail: foodThumbnail,
          available_from: foodAvailableFrom,
          available_until: foodAvailableUntil,
          is_available: foodIsAvailable ? 1 : 0
        });
        if (added) {
          setFoodItems(prev => [added, ...prev]);
          showToast(`"${added.name}" added to menu successfully`);
          resetFoodForm();
        }
      } else if (foodFormMode === 'edit' && editingFoodId) {
        const updated = await updateFoodItem(editingFoodId, {
          name: foodName.trim(),
          thumbnail: foodThumbnail,
          available_from: foodAvailableFrom,
          available_until: foodAvailableUntil,
          is_available: foodIsAvailable ? 1 : 0
        });
        if (updated) {
          setFoodItems(prev => prev.map(f => f.id === editingFoodId ? updated : f));
          showToast(`"${updated.name}" updated successfully`);
          resetFoodForm();
        }
      }
    } catch (err: any) {
      showToast('Error saving food item', 'error');
    } finally {
      setSubmittingFood(false);
    }
  };

  const handleDeleteFood = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      return;
    }
    const success = await deleteFoodItem(id);
    if (success) {
      setFoodItems(prev => prev.filter(f => f.id !== id));
      showToast(`"${name}" removed from menu`);
      if (editingFoodId === id) resetFoodForm();
    } else {
      showToast('Failed to delete food item', 'error');
    }
  };

  // ==========================================
  // SETTINGS & PASSWORD HANDLERS
  // ==========================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateSettings({ whatsapp_number: whatsappInput.trim() });
      if (updated) {
        setSettings(updated);
        showToast('WhatsApp booking number updated successfully');
      } else {
        showToast('Failed to update WhatsApp settings', 'error');
      }
    } catch (err: any) {
      showToast('Error updating settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await changeAdminPassword(currentPassword, newPassword);
      if (res.success) {
        showToast('Password changed successfully. Please remember your new password.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast('Password update failed: ' + err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // Computed Room Counts
  const availableCount = rooms.filter(r => (r.status || (r.is_available ? 'Available' : 'Occupied')) === 'Available').length;
  const occupiedCount = rooms.filter(r => (r.status || (r.is_available ? 'Available' : 'Occupied')) === 'Occupied').length;
  const reservedCount = rooms.filter(r => r.status === 'Reserved').length;
  const maintenanceCount = rooms.filter(r => r.status === 'Maintenance').length;

  const filteredRooms = rooms.filter(r => {
    if (roomFilter === 'all') return true;
    const current = r.status || (r.is_available ? 'Available' : 'Occupied');
    return current === roomFilter;
  });

  const filteredGallery = galleryItems.filter(item => {
    if (galleryFilter === 'all') return true;
    return item.category === galleryFilter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade">
      <div className="bg-gray-100 rounded-3xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        
        {/* Top Header */}
        <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-black text-xl shadow">
              <i className="fa fa-sliders-h"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-wide">GRAND TRAVELA &bull; ADMIN CONTROL</h2>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-blue-950 px-2 py-0.5 rounded-full">
                  Live Management
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Logged in as <span className="text-white font-bold">{adminUser?.username || 'Administrator'}</span> &bull; 
                Entrance, Reception, Live Room Availability &amp; Visual Tour Sequence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                adminLogout();
                onLogout();
              }}
              className="bg-red-600/90 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Sign Out of Admin Console"
            >
              <i className="fa fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Dashboard"
            >
              <i className="fa fa-times"></i>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="bg-white px-6 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fa fa-door-open"></i>
              <span>Rooms &amp; Live Availability ({rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('facilities')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'facilities'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fa fa-archway text-amber-500"></i>
              <span>Entrance &amp; Reception ({facilities.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fa fa-images text-blue-500"></i>
              <span>Dynamic Gallery ({galleryItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('food')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'food'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fa fa-utensils"></i>
              <span>Kitchen &amp; Dining ({foodItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fab fa-whatsapp text-emerald-500"></i>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-hotel-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="fa fa-key"></i>
              <span>Security</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {uploadingImage && (
              <span className="text-amber-600 font-bold flex items-center space-x-1 animate-pulse">
                <i className="fa fa-spinner fa-spin"></i>
                <span>Uploading Image...</span>
              </span>
            )}
            <button
              onClick={loadAllData}
              className="text-gray-600 hover:text-hotel-primary px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white flex items-center space-x-1 cursor-pointer font-semibold"
              title="Refresh Data from Database"
            >
              <i className="fa fa-sync-alt"></i>
              <span>Sync All</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md animate-fade ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: ROOM MANAGEMENT & LIVE AVAILABILITY                     */}
          {/* ============================================================== */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {/* Summary Stats & Bulk Actions */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-hotel-primary">
                    <i className="fa fa-hotel text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Room Inventory: {rooms.length} Sequential Rooms</h3>
                    <p className="text-xs text-gray-500">
                      Live availability updates instantly persist to SQLite and reflect across the public site.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">
                    {availableCount} Available
                  </span>
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold">
                    {occupiedCount} Occupied
                  </span>
                  <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-bold">
                    {reservedCount} Reserved
                  </span>
                  <span className="bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-xl text-xs font-bold">
                    {maintenanceCount} Maintenance
                  </span>

                  <div className="border-l border-gray-200 h-6 mx-1 hidden sm:block"></div>

                  <button
                    onClick={() => handleBulkStatus('Available')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Mark all rooms Available"
                  >
                    All Available
                  </button>
                  <button
                    onClick={() => handleBulkStatus('Occupied')}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Mark all rooms Occupied"
                  >
                    All Occupied
                  </button>

                  <button
                    onClick={handleOpenAddRoom}
                    className="bg-blue-950 hover:bg-blue-900 text-amber-300 border border-amber-400/50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <i className="fa fa-plus"></i>
                    <span>Add Room</span>
                  </button>
                </div>
              </div>

              {/* Add / Edit Room Form Accordion */}
              {roomFormOpen && (
                <div id="room-form-card" className="bg-white rounded-2xl p-6 shadow-md border-2 border-hotel-primary/30 animate-fade">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-hotel-primary flex items-center justify-center font-bold">
                        <i className={`fa ${roomFormMode === 'add' ? 'fa-plus' : 'fa-edit'}`}></i>
                      </div>
                      <h4 className="font-extrabold text-gray-900 text-base">
                        {roomFormMode === 'add' ? 'Add New Room Listing' : `Edit ${roomNumberInput}`}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={resetRoomForm}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-3 py-1 rounded-lg bg-gray-100"
                    >
                      Close Form &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoom} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Room Number */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Room Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={roomNumberInput}
                          onChange={(e) => setRoomNumberInput(e.target.value)}
                          placeholder="e.g. Room 01, Room 21"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white font-bold"
                        />
                      </div>

                      {/* Room Title */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Display Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={roomTitleInput}
                          onChange={(e) => setRoomTitleInput(e.target.value)}
                          placeholder="e.g. Executive King Suite"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                        />
                      </div>

                      {/* Room Type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Room Category / Type
                        </label>
                        <select
                          value={roomTypeInput}
                          onChange={(e) => setRoomTypeInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                        >
                          <option value="Deluxe King Suite">Deluxe King Suite</option>
                          <option value="Luxury Double Suite">Luxury Double Suite</option>
                          <option value="Executive Room">Executive Room</option>
                          <option value="Family Comfort Suite">Family Comfort Suite</option>
                          <option value="Standard Luxury Single">Standard Luxury Single</option>
                        </select>
                      </div>

                      {/* Availability Status */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Live Availability Status *
                        </label>
                        <select
                          value={roomStatusInput}
                          onChange={(e) => setRoomStatusInput(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-hotel-primary focus:bg-white"
                        >
                          <option value="Available">Available (Ready for Booking)</option>
                          <option value="Occupied">Occupied (Guest Checked In)</option>
                          <option value="Reserved">Reserved (Confirmed Booking)</option>
                          <option value="Maintenance">Maintenance (Out of Service)</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Room Description &amp; Amenities
                      </label>
                      <textarea
                        rows={2}
                        value={roomDescInput}
                        onChange={(e) => setRoomDescInput(e.target.value)}
                        placeholder="Detail air conditioning, king bedding, ensuite bathroom, wardrobe, high-speed WiFi..."
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                      ></textarea>
                    </div>

                    {/* Photograph Upload & Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase">
                          Real Room Photograph *
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={roomImageInput}
                            onChange={(e) => setRoomImageInput(e.target.value)}
                            placeholder="/images/02-room-01.jpg or uploaded URL"
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                          />
                          <label className="bg-hotel-primary hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center space-x-1.5 shrink-0">
                            <i className="fa fa-upload"></i>
                            <span>Upload Real Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, (url) => setRoomImageInput(url));
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Select a real photograph from your device. Supported formats: JPG, PNG, WEBP (up to 15MB).
                        </p>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-28 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shadow-sm relative">
                          <img
                            src={roomImageInput}
                            alt="Room Preview"
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/images/02-room-01.jpg'; }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-1">Image Preview</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Display Sequence (Sort Order)
                        </label>
                        <input
                          type="number"
                          value={roomOrderInput}
                          onChange={(e) => setRoomOrderInput(e.target.value)}
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="room-publish-check"
                          checked={roomPublishedInput}
                          onChange={(e) => setRoomPublishedInput(e.target.checked)}
                          className="w-4 h-4 text-hotel-primary rounded cursor-pointer"
                        />
                        <label htmlFor="room-publish-check" className="text-xs font-bold text-gray-800 cursor-pointer">
                          Publish on Public Website
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={resetRoomForm}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingRoom}
                        className="bg-hotel-primary hover:bg-blue-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 cursor-pointer"
                      >
                        {savingRoom ? (
                          <>
                            <i className="fa fa-spinner fa-spin"></i>
                            <span>Saving Room...</span>
                          </>
                        ) : (
                          <>
                            <i className="fa fa-check"></i>
                            <span>{roomFormMode === 'add' ? 'Create Room' : 'Update Room'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRoomFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      roomFilter === 'all' ? 'bg-hotel-primary text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    All ({rooms.length})
                  </button>
                  <button
                    onClick={() => setRoomFilter('Available')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      roomFilter === 'Available' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Available ({availableCount})
                  </button>
                  <button
                    onClick={() => setRoomFilter('Occupied')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      roomFilter === 'Occupied' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Occupied ({occupiedCount})
                  </button>
                  <button
                    onClick={() => setRoomFilter('Reserved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      roomFilter === 'Reserved' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Reserved ({reservedCount})
                  </button>
                  <button
                    onClick={() => setRoomFilter('Maintenance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      roomFilter === 'Maintenance' ? 'bg-rose-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Maintenance ({maintenanceCount})
                  </button>
                </div>

                <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                  Showing {filteredRooms.length} of {rooms.length} rooms
                </span>
              </div>

              {/* Room Cards Grid */}
              {loadingRooms ? (
                <div className="text-center py-12">
                  <i className="fa fa-spinner fa-spin text-2xl text-hotel-primary mb-2"></i>
                  <p className="text-xs text-gray-500">Loading rooms from database...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredRooms.map((room) => {
                    const status = (room.status || (room.is_available ? 'Available' : 'Occupied')) as 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';

                    return (
                      <div
                        key={room.id}
                        className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                          status === 'Available' ? 'border-emerald-300' :
                          status === 'Occupied' ? 'border-amber-300' :
                          status === 'Reserved' ? 'border-indigo-300' : 'border-rose-300'
                        }`}
                      >
                        <div className="h-36 rounded-xl overflow-hidden relative mb-3 bg-gray-100">
                          <img
                            src={room.image_url}
                            alt={room.room_number}
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/images/02-room-01.jpg'; }}
                          />
                          <div className="absolute top-2 left-2 bg-blue-950/90 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-md shadow">
                            {room.room_number}
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow text-white flex items-center space-x-1 ${
                              status === 'Available' ? 'bg-emerald-600' :
                              status === 'Occupied' ? 'bg-amber-600' :
                              status === 'Reserved' ? 'bg-indigo-600' : 'bg-rose-600'
                            }`}>
                              {status === 'Available' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                              <span>{status}</span>
                            </span>
                          </div>
                          {Boolean(room.is_published === 0 || room.is_published === false) && (
                            <div className="absolute bottom-2 left-2 bg-gray-900/80 text-white text-[9px] px-2 py-0.5 rounded">
                              Draft / Unpublished
                            </div>
                          )}
                        </div>

                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-extrabold text-gray-900 text-sm">{room.title || room.room_number}</h4>
                            <p className="text-[11px] text-gray-500">{room.room_type || 'Deluxe Room'}</p>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            #{room.display_order || '0'}
                          </span>
                        </div>

                        {/* 4-Way Direct Status Selector */}
                        <div className="pt-2 border-t border-gray-100 space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Set Live Status:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleUpdateRoomStatus(room.id, 'Available')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                status === 'Available'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <i className="fa fa-check text-[9px]"></i>
                              <span>Available</span>
                            </button>

                            <button
                              onClick={() => handleUpdateRoomStatus(room.id, 'Occupied')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                status === 'Occupied'
                                  ? 'bg-amber-600 text-white shadow'
                                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              <i className="fa fa-user-lock text-[9px]"></i>
                              <span>Occupied</span>
                            </button>

                            <button
                              onClick={() => handleUpdateRoomStatus(room.id, 'Reserved')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                status === 'Reserved'
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                              }`}
                            >
                              <i className="fa fa-calendar-check text-[9px]"></i>
                              <span>Reserved</span>
                            </button>

                            <button
                              onClick={() => handleUpdateRoomStatus(room.id, 'Maintenance')}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                                status === 'Maintenance'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                              }`}
                            >
                              <i className="fa fa-tools text-[9px]"></i>
                              <span>Maint.</span>
                            </button>
                          </div>
                        </div>

                        {/* Edit & Delete Controls */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                          <button
                            onClick={() => handleEditRoomClick(room)}
                            className="text-hotel-primary hover:text-blue-900 font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <i className="fa fa-edit"></i>
                            <span>Edit Room</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room)}
                            className="text-red-600 hover:text-red-800 font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <i className="fa fa-trash"></i>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ENTRANCE & RECEPTION MANAGEMENT                         */}
          {/* ============================================================== */}
          {activeTab === 'facilities' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-700">
                    <i className="fa fa-archway text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Entrance &amp; Reception Display Management</h3>
                    <p className="text-xs text-gray-500">
                      Manage real photographs, titles, descriptions, and sequence order for the introductory facility areas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Facility Form */}
              {editingFacilityId && (
                <div id="facility-edit-form" className="bg-white rounded-2xl p-6 shadow-md border-2 border-amber-400/50 animate-fade">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <h4 className="font-extrabold text-gray-900 text-base">
                      Edit Section: {facilities.find(f => f.id === editingFacilityId)?.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingFacilityId(null)}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-3 py-1 rounded-lg bg-gray-100"
                    >
                      Cancel &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveFacility} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Display Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={facilityTitle}
                          onChange={(e) => setFacilityTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-hotel-primary focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Display Sequence Number
                        </label>
                        <input
                          type="number"
                          value={facilityOrder}
                          onChange={(e) => setFacilityOrder(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Description &amp; Details
                      </label>
                      <textarea
                        rows={3}
                        value={facilityDesc}
                        onChange={(e) => setFacilityDesc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                      ></textarea>
                    </div>

                    {/* Real Photograph Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase">
                          Real Photograph *
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={facilityImage}
                            onChange={(e) => setFacilityImage(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                          />
                          <label className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center space-x-1.5 shrink-0">
                            <i className="fa fa-camera"></i>
                            <span>Upload Real Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, (url) => setFacilityImage(url));
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-28 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shadow-sm">
                          <img
                            src={facilityImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/images/00-entrance.jpg'; }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-1">Image Preview</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={facilityPublished}
                          onChange={(e) => setFacilityPublished(e.target.checked)}
                          className="w-4 h-4 text-hotel-primary rounded cursor-pointer"
                        />
                        <span>Published on Website</span>
                      </label>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingFacilityId(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingFacility}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 cursor-pointer"
                        >
                          {savingFacility ? (
                            <>
                              <i className="fa fa-spinner fa-spin"></i>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa fa-save"></i>
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Facilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {facilities.map((fac) => {
                  const isPublished = Boolean(fac.is_published !== 0 && fac.is_published !== false);

                  return (
                    <div
                      key={fac.id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-56 relative bg-gray-900 overflow-hidden">
                          <img
                            src={fac.image_url}
                            alt={fac.title}
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/images/00-entrance.jpg'; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/30"></div>
                          <div className="absolute top-3 left-3 bg-amber-400 text-blue-950 font-black text-xs uppercase px-3 py-1 rounded-full shadow">
                            Sequence #{fac.display_order} &bull; {fac.type.toUpperCase()}
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isPublished ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-200'
                            }`}>
                              {isPublished ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-4 right-4 text-white">
                            <h4 className="text-lg font-bold">{fac.title}</h4>
                          </div>
                        </div>

                        <div className="p-5 space-y-2">
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {fac.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-mono">
                          ID: {fac.id} &bull; Order: {fac.display_order}
                        </span>
                        <button
                          onClick={() => handleEditFacilityClick(fac)}
                          className="bg-hotel-primary hover:bg-blue-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
                        >
                          <i className="fa fa-edit"></i>
                          <span>Edit Details &amp; Photo</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: DYNAMIC GALLERY MANAGEMENT                               */}
          {/* ============================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-hotel-primary">
                    <i className="fa fa-images text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Dynamic Gallery Sequence Management</h3>
                    <p className="text-xs text-gray-500">
                      Sequence: Entrance &rarr; Reception &rarr; Availability &rarr; Room 01..Room 07 &rarr; Facilities
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    resetGalleryForm();
                    setGalleryFormOpen(true);
                  }}
                  className="bg-blue-950 hover:bg-blue-900 text-amber-300 border border-amber-400/50 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow"
                >
                  <i className="fa fa-plus"></i>
                  <span>Add Gallery Item</span>
                </button>
              </div>

              {/* Add / Edit Gallery Item Form */}
              {galleryFormOpen && (
                <div id="gallery-form-card" className="bg-white rounded-2xl p-6 shadow-md border-2 border-hotel-primary/30 animate-fade">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <h4 className="font-extrabold text-gray-900 text-base">
                      {galleryFormMode === 'add' ? 'Add New Gallery Item' : `Edit: ${galleryTitle}`}
                    </h4>
                    <button
                      type="button"
                      onClick={resetGalleryForm}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-3 py-1 rounded-lg bg-gray-100"
                    >
                      Close Form &times;
                    </button>
                  </div>

                  <form onSubmit={handleSaveGalleryItem} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Category */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Category *
                        </label>
                        <select
                          value={galleryCategory}
                          onChange={(e) => setGalleryCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-hotel-primary focus:bg-white"
                        >
                          <option value="entrance">1. Entrance</option>
                          <option value="reception">2. Reception</option>
                          <option value="availability">3. Room Availability</option>
                          <option value="rooms">4. Rooms (Sequential)</option>
                          <option value="facilities">5. Facilities &amp; Dining</option>
                          <option value="parking">6. Parking</option>
                          <option value="scenery">7. Scenery</option>
                          <option value="night">8. Evening &amp; Night</option>
                        </select>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Display Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={galleryTitle}
                          onChange={(e) => setGalleryTitle(e.target.value)}
                          placeholder="e.g. Room 01 Executive Suite"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                        />
                      </div>

                      {/* Room Number (if room) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Room Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={galleryRoomNumber}
                          onChange={(e) => setGalleryRoomNumber(e.target.value)}
                          placeholder="e.g. Room 01"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>

                      {/* Display Order */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Sequence Order *
                        </label>
                        <input
                          type="number"
                          value={galleryOrder}
                          onChange={(e) => setGalleryOrder(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Caption / Description
                      </label>
                      <textarea
                        rows={2}
                        value={galleryDesc}
                        onChange={(e) => setGalleryDesc(e.target.value)}
                        placeholder="Brief photograph description..."
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                      ></textarea>
                    </div>

                    {/* Image Upload */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase">
                          Photograph URL or Upload *
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={galleryImage}
                            onChange={(e) => setGalleryImage(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                          />
                          <label className="bg-hotel-primary hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center space-x-1.5 shrink-0">
                            <i className="fa fa-camera"></i>
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, (url) => setGalleryImage(url));
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-28 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shadow-sm">
                          <img
                            src={galleryImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/images/02-room-01.jpg'; }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-1">Image Preview</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={galleryPublished}
                          onChange={(e) => setGalleryPublished(e.target.checked)}
                          className="w-4 h-4 text-hotel-primary rounded cursor-pointer"
                        />
                        <span>Published in Gallery</span>
                      </label>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={resetGalleryForm}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingGallery}
                          className="bg-hotel-primary hover:bg-blue-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 cursor-pointer"
                        >
                          {savingGallery ? (
                            <>
                              <i className="fa fa-spinner fa-spin"></i>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa fa-check"></i>
                              <span>{galleryFormMode === 'add' ? 'Save Item' : 'Update Item'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Gallery Filter Tabs */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGalleryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'all' ? 'bg-hotel-primary text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    All ({galleryItems.length})
                  </button>
                  <button
                    onClick={() => setGalleryFilter('entrance')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'entrance' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Entrance
                  </button>
                  <button
                    onClick={() => setGalleryFilter('reception')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'reception' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Reception
                  </button>
                  <button
                    onClick={() => setGalleryFilter('availability')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'availability' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Availability
                  </button>
                  <button
                    onClick={() => setGalleryFilter('rooms')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'rooms' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Rooms (01..20)
                  </button>
                  <button
                    onClick={() => setGalleryFilter('facilities')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'facilities' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Facilities
                  </button>
                  <button
                    onClick={() => setGalleryFilter('parking')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'parking' ? 'bg-slate-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Parking
                  </button>
                  <button
                    onClick={() => setGalleryFilter('scenery')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'scenery' ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Scenery
                  </button>
                  <button
                    onClick={() => setGalleryFilter('night')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      galleryFilter === 'night' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Evening &amp; Night
                  </button>
                </div>

                <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                  Showing {filteredGallery.length} items
                </span>
              </div>

              {/* Gallery Grid */}
              {loadingGallery ? (
                <div className="text-center py-12">
                  <i className="fa fa-spinner fa-spin text-2xl text-hotel-primary mb-2"></i>
                  <p className="text-xs text-gray-500">Loading gallery items...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredGallery.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between"
                    >
                      <div className="h-28 relative bg-gray-100 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e: any) => { e.target.src = '/images/02-room-01.jpg'; }}
                        />
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          #{item.display_order}
                        </div>
                        <div className="absolute top-1 right-1">
                          <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-900/80 text-amber-300">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 space-y-1">
                        <h5 className="font-bold text-gray-900 text-xs truncate" title={item.title}>
                          {item.title}
                        </h5>
                        {item.room_number && (
                          <p className="text-[10px] text-gray-500 font-semibold">{item.room_number}</p>
                        )}
                      </div>

                      <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => handleEditGalleryClick(item)}
                          className="text-hotel-primary hover:text-blue-900 font-bold cursor-pointer"
                        >
                          <i className="fa fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteGalleryItem(item)}
                          className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: FOOD MANAGEMENT (STRICTLY NO PRICING)                    */}
          {/* ============================================================== */}
          {activeTab === 'food' && (
            <div className="space-y-6">
              <div id="food-form-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
                      <i className="fa fa-utensils"></i>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      {foodFormMode === 'add' ? 'Add New Food Item' : `Edit Food Item (${foodName})`}
                    </h3>
                  </div>

                  {foodFormMode === 'edit' && (
                    <button
                      type="button"
                      onClick={resetFoodForm}
                      className="text-xs text-gray-600 hover:text-gray-900 font-semibold px-3 py-1 rounded-lg bg-gray-100"
                    >
                      Cancel Edit &times;
                    </button>
                  )}
                </div>

                <form onSubmit={handleFoodSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Food Name * (e.g. Chicken Biryani)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chicken Biryani, Club Sandwich, Daal Chawal"
                        value={foodName}
                        onChange={(e) => setFoodName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Food Image *
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                          <img
                            src={foodThumbnail}
                            alt="Food preview"
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = '/uploads/img_1791024997069_val5a6.jpeg'; }}
                          />
                        </div>
                        <label className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-300 transition-colors flex items-center space-x-1.5 cursor-pointer">
                          <i className="fa fa-upload text-gray-600"></i>
                          <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImage}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, (url) => setFoodThumbnail(url));
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Available From
                      </label>
                      <input
                        type="text"
                        value={foodAvailableFrom}
                        onChange={(e) => setFoodAvailableFrom(e.target.value)}
                        placeholder="e.g. 12:00 PM or 07:00 AM"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Available Until
                      </label>
                      <input
                        type="text"
                        value={foodAvailableUntil}
                        onChange={(e) => setFoodAvailableUntil(e.target.value)}
                        placeholder="e.g. 10:00 PM or 11:30 PM"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="food-available-check"
                        checked={foodIsAvailable}
                        onChange={(e) => setFoodIsAvailable(e.target.checked)}
                        className="w-4 h-4 text-hotel-primary rounded cursor-pointer"
                      />
                      <label htmlFor="food-available-check" className="text-xs font-bold text-gray-800 cursor-pointer">
                        Currently Offered in Kitchen
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submittingFood}
                      className="bg-hotel-primary hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow transition-all cursor-pointer flex items-center space-x-2"
                    >
                      {submittingFood ? (
                        <>
                          <i className="fa fa-spinner fa-spin"></i>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa fa-check"></i>
                          <span>{foodFormMode === 'add' ? 'Add Food Item' : 'Update Food Item'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Menu Items List */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-900">
                    Menu Items List ({foodItems.length})
                  </h3>
                </div>

                {loadingFood ? (
                  <div className="text-center py-8">
                    <i className="fa fa-spinner fa-spin text-xl text-hotel-primary mb-2"></i>
                    <p className="text-xs text-gray-500">Loading food items...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {foodItems.map((item) => {
                      const isAvail = Boolean(item.is_available === 1 || item.is_available === true);

                      return (
                        <div
                          key={item.id}
                          className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between"
                        >
                          <div className="flex space-x-3 mb-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                              <img
                                src={item.thumbnail}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e: any) => { e.target.src = '/uploads/img_1791024997069_val5a6.jpeg'; }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {isAvail ? 'Available' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                <i className="fa fa-clock text-amber-500 me-1"></i>
                                {item.available_from} &ndash; {item.available_until}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleEditFoodClick(item)}
                              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center space-x-1 cursor-pointer"
                            >
                              <i className="fa fa-edit"></i>
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteFood(item.id, item.name)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center space-x-1 cursor-pointer"
                            >
                              <i className="fa fa-trash"></i>
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: WHATSAPP SETTINGS                                        */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3 mb-4 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
                    <i className="fab fa-whatsapp"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Hotel WhatsApp Configuration</h3>
                    <p className="text-xs text-gray-500">Official number for customer bookings and inquiries</p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Hotel WhatsApp Number (with Country Code)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 923001234567 or +92 300 1234567"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Enter the WhatsApp number including country code without spaces.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <i className="fa fa-info-circle"></i>
                      <span>WhatsApp Deep Link Workflow:</span>
                    </div>
                    <p>
                      When website visitors click &quot;Contact on WhatsApp&quot; or &quot;Book via WhatsApp&quot;, their WhatsApp automatically opens with a message pre-filled with the selected room number and availability status.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      {savingSettings ? (
                        <>
                          <i className="fa fa-spinner fa-spin"></i>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa fa-save"></i>
                          <span>Save WhatsApp Number</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const testLink = buildWhatsAppLink(whatsappInput, 'Room 01', true);
                        window.open(testLink, '_blank');
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl border border-gray-300 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <i className="fab fa-whatsapp text-emerald-600"></i>
                      <span>Test WhatsApp Link</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Cash Payment Notice */}
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <h4 className="font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <i className="fa fa-money-bill-wave text-amber-600"></i>
                  <span>Zero Online Payment Gateway Notice</span>
                </h4>
                <p>
                  Online payment gateways are disabled per hotel policy. Customers confirm reservations via WhatsApp and settle their payment in <strong>CASH AT THE HOTEL</strong> upon check-in.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: SECURITY & CREDENTIALS                                   */}
          {/* ============================================================== */}
          {activeTab === 'security' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3 mb-4 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-hotel-primary flex items-center justify-center text-lg">
                    <i className="fa fa-lock"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Change Admin Password</h3>
                    <p className="text-xs text-gray-500">Update administrative console credentials</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-hotel-primary focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full bg-hotel-primary hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow transition-all cursor-pointer"
                  >
                    {changingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
