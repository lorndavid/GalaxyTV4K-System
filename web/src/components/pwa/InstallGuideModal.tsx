import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import {
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIos: boolean;
  isInstallable: boolean;
  onNativeInstall?: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  isIos,
  isInstallable,
  onNativeInstall,
}) => {
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isKhmer
          ? 'ដំឡើងលើអេក្រង់ដើម (Add to Home Screen)'
          : 'Install App on Home Screen'
      }
      maxWidth="md"
    >
      <div className="p-5 space-y-5 select-none">
        {/* Header App Icon Preview */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-dark-elevated/60 border border-slate-200/70 dark:border-dark-border">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs border border-white dark:border-dark-surface flex-shrink-0 bg-white p-1.5 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Galaxy TV4K"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Galaxy TV4K</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                PWA
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {isKhmer
                ? 'ចូលប្រើប្រាស់រហ័ស និងកត់ត្រាវត្តមានងាយស្រួល'
                : 'Fast one-tap access & attendance check-in'}
            </p>
          </div>
        </div>

        {/* Platform Specific Steps */}
        {isIos ? (
          /* iOS Step-by-Step Instructions */
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isKhmer
                ? 'ការណែនាំសម្រាប់ទូរស័ព្ទ iPhone (Safari) ៖'
                : 'Instructions for iPhone (Safari):'}
            </p>

            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-dark-border/60">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {isKhmer ? 'ជំហានទី ១៖ ចុចប៊ូតុង Share' : 'Step 1: Tap the Share button'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  {isKhmer
                    ? 'ចុចប៊ូតុង Share (រូបព្រួញចង្អុលឡើងលើ) នៅរបារខាងក្រោមនៃ Safari។'
                    : 'Tap the Share icon (box with upward arrow) at the bottom toolbar.'}
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-dark-border/60">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {isKhmer
                    ? 'ជំហានទី ២៖ ជ្រើសរើស "បន្ថែមទៅអេក្រង់ដើម"'
                    : 'Step 2: Choose "Add to Home Screen"'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  {isKhmer
                    ? 'អូសចុះក្រោមបន្តិច រួចចុចលើពាក្យ "បន្ថែមទៅអេក្រង់ដើម (Add to Home Screen)"។'
                    : 'Scroll down the share sheet and tap "Add to Home Screen".'}
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-dark-border/60">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {isKhmer ? 'ជំហានទី ៣៖ ចុច "បន្ថែម"' : 'Step 3: Tap "Add"'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  {isKhmer
                    ? 'ចុចប៊ូតុង "បន្ថែម (Add)" នៅជ្រុងខាងស្តាំលើ។ រួចរាល់!'
                    : 'Tap "Add" in the top-right corner to finish installation.'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Android Step-by-Step Instructions */
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isKhmer
                ? 'ការណែនាំសម្រាប់ទូរស័ព្ទ Android (Chrome) ៖'
                : 'Instructions for Android (Chrome):'}
            </p>

            {isInstallable && onNativeInstall ? (
              <div className="pt-1">
                <Button
                  onClick={() => {
                    onNativeInstall();
                    onClose();
                  }}
                  variant="primary"
                  className="w-full h-11 text-xs font-bold gap-2 shadow-md shadow-brand-500/25"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isKhmer ? 'ដំឡើងឥឡូវនេះ (Install Now)' : 'Install App Now'}
                  </span>
                </Button>
              </div>
            ) : null}

            {/* Android Manual Step */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-dark-border/60">
              <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MoreVertical className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  {isKhmer
                    ? 'វិធីដំឡើងដោយដៃតាម Chrome'
                    : 'Manual Installation via Chrome'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  {isKhmer
                    ? 'ចុចសញ្ញាចុចបី (⋮) នៅជ្រុងខាងស្តាំលើនៃ Chrome រួចជ្រើសរើស "បន្ថែមទៅអេក្រង់ដើម (Add to Home screen)" ឬ "ដំឡើងកម្មវិធី (Install app)"។'
                    : 'Tap the three dots (⋮) menu in top-right of Chrome, then select "Add to Home screen" or "Install app".'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Summary */}
        <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 text-[11px] text-brand-900 dark:text-brand-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
          <span>
            {isKhmer
              ? 'បន្ទាប់ពីដំឡើងរួច អ្នកអាចបើកប្រើបានភ្លាមៗដូច App ទូរស័ព្ទ និងមិនបាត់ Status bar ឡើយ។'
              : 'Once installed, the app opens in full-screen standalone mode with no browser address bars.'}
          </span>
        </div>

        {/* Close Action */}
        <div className="pt-1">
          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full text-xs font-semibold h-10"
          >
            {isKhmer ? 'យល់ព្រម (Got it)' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
