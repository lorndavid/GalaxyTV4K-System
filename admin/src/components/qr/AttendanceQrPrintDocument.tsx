import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, MapPin, Clock, Calendar } from 'lucide-react';

export interface AttendanceQrPrintData {
  qrName?: string;
  payload?: string;
  token?: string;
  date?: string;
  validFrom?: string;
  validUntil?: string;
  officeName?: string;
  description?: string;
  companyName?: string;
}

export const AttendanceQrPrintDocument: React.FC<{ data: AttendanceQrPrintData }> = ({ data }) => {
  const qrValue = data.payload || JSON.stringify({ token: data.token, version: '1.0' });
  const formattedDate = data.date
    ? new Date(data.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div className="a4-print-sheet bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[16mm] mx-auto flex flex-col justify-between box-border border border-slate-200 print:border-none print:p-[14mm] print:m-0 print:w-full print:h-full print:shadow-none shadow-xl select-none font-sans">
      {/* 1. Header with Official Branding */}
      <div className="border-b-2 border-slate-900 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl p-2 bg-slate-50 border border-slate-200 flex items-center justify-center">
            <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {data.companyName || 'Galaxy TV4K'}
            </h1>
            <p className="text-sm font-semibold text-slate-600">Employee Attendance & Time Tracking System</p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Official Attendance QR
          </span>
          <p className="text-[11px] font-mono text-slate-500 mt-1">Office: {data.officeName || 'Main Headquarters'}</p>
        </div>
      </div>

      {/* 2. Main High-Resolution Attendance QR Code Card */}
      <div className="my-auto py-8 text-center flex flex-col items-center justify-center space-y-6">
        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200 inline-block">
            ATTENDANCE CHECK-IN / CHECK-OUT
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight pt-2">
            {data.qrName || 'Main Office Attendance'}
          </h2>
          {data.description && (
            <p className="text-sm text-slate-500 max-w-md mx-auto">{data.description}</p>
          )}
        </div>

        {/* Large High-Contrast Scannable QR Code */}
        <div className="p-6 bg-white rounded-3xl border-4 border-slate-900 shadow-lg flex items-center justify-center">
          <QRCodeSVG
            value={qrValue}
            size={280}
            level="H"
            includeMargin={true}
            className="w-[280px] h-[280px]"
          />
        </div>

        {/* Validity & Time Constraints Table */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg text-left pt-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Effective Date</span>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono">{formattedDate}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Valid Hours</span>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {data.validFrom || '07:00 AM'} — {data.validUntil || '06:00 PM'}
            </p>
          </div>
        </div>

        {/* Clear Step-by-Step Instructions */}
        <div className="w-full max-w-lg bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-left space-y-1.5">
          <p className="text-xs font-bold text-blue-900">How to record your attendance:</p>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside font-medium">
            <li>Open the <strong>Employee Attendance PWA</strong> on your mobile device.</li>
            <li>Tap the circular <strong>QR Scan</strong> button in the bottom navigation.</li>
            <li>Align your camera with this QR code while within the office geofence.</li>
          </ol>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
        <p>Generated by System HR Security Engine • Authorized Kiosk Sheet</p>
        <p className="font-mono text-[11px]">
          Printed: {new Date().toLocaleString('en-US')}
        </p>
      </div>
    </div>
  );
};
