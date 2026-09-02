import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, MapPin, Clock, Calendar, QrCode, Smartphone } from 'lucide-react';

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
    <div className="a4-print-sheet bg-white text-slate-900 w-[210mm] h-[297mm] max-h-[297mm] p-[12mm] sm:p-[14mm] mx-auto flex flex-col justify-between box-border border border-slate-200 print:border-none print:p-[12mm] print:m-0 print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:shadow-none shadow-2xl select-none font-sans overflow-hidden">
      {/* 1. Header with Official Branding */}
      <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl p-1.5 bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {data.companyName || 'Galaxy TV4K'}
            </h1>
            <p className="text-xs font-semibold text-slate-600">Employee Attendance & Time Tracking System</p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Official Attendance Station
          </span>
          <p className="text-[11px] font-mono text-slate-500 mt-1 flex items-center justify-end gap-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            {data.officeName || 'Headquarters'}
          </p>
        </div>
      </div>

      {/* 2. Main High-Resolution Attendance QR Code Card */}
      <div className="my-auto py-2 text-center flex flex-col items-center justify-center space-y-4">
        {/* Title Tag */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 inline-block">
            ATTENDANCE CHECK-IN & CHECK-OUT
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
            {data.qrName || 'Reception Attendance QR'}
          </h2>
          {data.description && (
            <p className="text-xs text-slate-500 max-w-md mx-auto">{data.description}</p>
          )}
        </div>

        {/* Large High-Contrast Scannable QR Code */}
        <div className="p-5 bg-white rounded-3xl border-4 border-slate-900 shadow-md flex items-center justify-center relative">
          <QRCodeSVG
            value={qrValue}
            size={240}
            level="H"
            includeMargin={false}
            className="w-[240px] h-[240px]"
          />
        </div>

        {/* Validity & Time Constraints */}
        <div className="grid grid-cols-2 gap-3.5 w-full max-w-md text-left">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Effective Date</p>
              <p className="text-xs font-bold text-slate-900 font-mono">{formattedDate}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Hours</p>
              <p className="text-xs font-bold text-slate-900 font-mono">
                {data.validFrom || '07:00 AM'} — {data.validUntil || '06:00 PM'}
              </p>
            </div>
          </div>
        </div>

        {/* Clear Step-by-Step Instructions */}
        <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>How to Record Attendance:</span>
          </div>
          <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside font-medium">
            <li>Open the <strong>Galaxy TV4K</strong> Employee Portal on your mobile device.</li>
            <li>Tap the center <strong>QR Scan</strong> button in the bottom navigation bar.</li>
            <li>Point your camera at this QR code to punch in/out.</li>
          </ol>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[11px] text-slate-500">
        <p className="font-medium">Galaxy TV4K Security & Location Verification Engine</p>
        <p className="font-mono text-[10px]">
          Authorized Station • Printed: {new Date().toLocaleDateString('en-US')}
        </p>
      </div>
    </div>
  );
};
