import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import apiClient from '../../api/client';
import { Camera, Image as ImageIcon, AlertCircle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');
  const { user, updateProfilePhoto } = useAuth();
  const { showToast } = useToast();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [quota, setQuota] = useState<{
    uploadsToday: number;
    maxDailyUploads: number;
    remainingUploadsToday: number;
  }>({
    uploadsToday: 0,
    maxDailyUploads: 2,
    remainingUploadsToday: 2,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchQuota = async () => {
    setIsLoadingQuota(true);
    try {
      const res = await apiClient.get('/profile/avatar-quota');
      if (res.data.success) {
        setQuota(res.data.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuota();
      setPreviewUrl(user?.employee?.profilePhoto || null);
      setSelectedBase64(null);
    }
  }, [isOpen, user?.employee?.profilePhoto]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(isKhmer ? 'សូមជ្រើសរើសឯកសាររូបភាពត្រឹមត្រូវ' : 'Please select a valid image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(isKhmer ? 'ទំហំរូបភាពត្រូវតែតូចជាង 5MB' : 'Image size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      setSelectedBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedBase64) return;
    if (quota.remainingUploadsToday <= 0) {
      showToast(
        isKhmer
          ? 'អ្នកបានផ្លាស់ប្តូររូបភាពគ្រប់ ២ ដងសម្រាប់ថ្ងៃនេះហើយ'
          : 'You have reached the daily limit of 2 updates for today',
        'error'
      );
      return;
    }

    setIsUploading(true);
    try {
      const res = await apiClient.post('/profile/avatar', {
        image: selectedBase64,
      });

      if (res.data.success) {
        const newPhotoUrl = res.data.data.profilePhoto;
        updateProfilePhoto(newPhotoUrl);
        showToast(
          isKhmer
            ? 'បានផ្លាស់ប្តូររូបភាពប្រវត្តិរូបដោយជោគជ័យ'
            : 'Profile photo updated successfully',
          'success'
        );
        onClose();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        (isKhmer ? 'មិនអាចប្តូររូបភាពបានទេ' : 'Failed to update profile photo');
      showToast(msg, 'error');
      fetchQuota();
    } finally {
      setIsUploading(false);
    }
  };

  const isLimitReached = quota.remainingUploadsToday <= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isKhmer ? 'ប្តូររូបភាពប្រវត្តិរូប (Profile Photo)' : 'Change Profile Photo'}
      maxWidth="sm"
    >
      <div className="p-5 space-y-5">
        {/* Daily Quota Banner */}
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            isLimitReached
              ? 'bg-danger-50 dark:bg-danger-950/40 border-danger-200 dark:border-danger-800/60 text-danger-800 dark:text-danger-300'
              : 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800/60 text-brand-900 dark:text-brand-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isLimitReached ? (
              <AlertCircle className="w-5 h-5 text-danger-500 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-brand-500 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {isKhmer
                  ? `កូតាប្រចាំថ្ងៃ: នៅសល់ ${quota.remainingUploadsToday} លើក (ក្នុងចំណោម ២)`
                  : `Daily limit: ${quota.remainingUploadsToday} of 2 updates remaining`}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isLimitReached
                  ? isKhmer
                    ? 'អ្នកបានប្តូរគ្រប់ចំនួន ២ ដងហើយ សូមព្យាយាមម្តងទៀតនៅថ្ងៃស្អែក'
                    : 'You reached your daily limit. Please try again tomorrow'
                  : isKhmer
                  ? 'អ្នកអាចផ្លាស់ប្តូររូបភាពបាន ២ ដងក្នុងមួយថ្ងៃ'
                  : 'You can change your photo up to 2 times per day'}
              </p>
            </div>
          </div>
        </div>

        {/* Circular Avatar Preview */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative w-32 h-32 rounded-full ring-4 ring-brand-500/20 shadow-lg overflow-hidden bg-slate-100 dark:bg-dark-elevated flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-10 h-10 text-slate-400" />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2.5 font-medium">
            {selectedBase64
              ? isKhmer ? 'រូបភាពដែលបានជ្រើសរើស' : 'Selected photo preview'
              : isKhmer ? 'រូបភាពបច្ចុប្បន្ន' : 'Current profile photo'}
          </p>
        </div>

        {/* Action Buttons */}
        {!isLimitReached && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-dark-border flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
            >
              <Camera className="w-4 h-4 text-brand-500" />
              <span>{isKhmer ? 'ថតរូប' : 'Take Photo'}</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-dark-border flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <span>{isKhmer ? 'ជ្រើសរើសរូប' : 'Choose File'}</span>
            </button>
          </div>
        )}

        {/* Hidden Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isUploading}>
            {isKhmer ? 'បោះបង់' : 'Cancel'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleUpload}
            disabled={!selectedBase64 || isLimitReached || isUploading}
            isLoading={isUploading}
          >
            {isKhmer ? 'រក្សាទុករូបភាព' : 'Save Photo'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
