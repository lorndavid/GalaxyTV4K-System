import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import L from 'leaflet';
import {
  MapPin,
  Building2,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Radio,
  History,
  AlertTriangle,
  UserCheck,
  UserX,
  Compass,
  ArrowRight,
} from 'lucide-react';

interface EmployeeLocationItem {
  id: string;
  employeeCode: string;
  displayName: string;
  department: string;
  isLocationSharingActive: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceFromOffice: number | null;
  status: string;
  freshness: 'LIVE' | 'RECENT' | 'STALE';
  lastUpdated: string | null;
}

interface CompanyOfficeInfo {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  accuracyThresholdMeters: number;
}

interface LocationHistoryItem {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceFromOffice: number;
  status: string;
  recordedAt: string;
}

export const LocationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const geofenceCircleRef = useRef<L.Circle | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INSIDE' | 'OUTSIDE' | 'INACTIVE'>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocationItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch all employee location statuses
  const { data, isLoading, refetch } = useQuery<{
    employees: EmployeeLocationItem[];
    companyOffice: CompanyOfficeInfo;
  }>({
    queryKey: ['adminEmployeesLocation'],
    queryFn: async () => {
      const res = await apiClient.get('/location/admin/employees');
      return res.data.data;
    },
    staleTime: 10000,
  });

  const employees = data?.employees || [];
  const office = data?.companyOffice || {
    name: 'Company HQ',
    latitude: 11.5564,
    longitude: 104.9282,
    radiusMeters: 100,
    accuracyThresholdMeters: 50,
  };

  // Fetch single employee location history
  const { data: historyData, isLoading: isHistoryLoading } = useQuery<{
    history: LocationHistoryItem[];
    events: any[];
  }>({
    queryKey: ['adminLocationHistory', selectedEmployee?.id, historyDate],
    queryFn: async () => {
      if (!selectedEmployee) return { history: [], events: [] };
      const res = await apiClient.get(
        `/location/admin/history/${selectedEmployee.id}?date=${historyDate}`
      );
      return res.data.data;
    },
    enabled: !!selectedEmployee && isHistoryModalOpen,
  });

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [office.latitude, office.longitude],
      zoom: 16,
      zoomControl: true,
    });

    // Clean OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Company Office Pin
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `
        <div style="background-color: #2563EB; color: white; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.4); border: 2px solid #FFFFFF;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([office.latitude, office.longitude], { icon: officeIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: Inter, sans-serif; padding: 4px;">
          <b style="color: #0F172A; font-size: 13px;">${office.name}</b>
          <p style="margin: 4px 0 0; color: #64748B; font-size: 11px;">Geofence Perimeter: <b>${office.radiusMeters}m</b></p>
        </div>`
      );

    // Geofence Circle
    const circle = L.circle([office.latitude, office.longitude], {
      radius: office.radiusMeters,
      color: '#2563EB',
      fillColor: '#3B82F6',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '4, 6',
    }).addTo(map);

    geofenceCircleRef.current = circle;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [office.latitude, office.longitude, office.radiusMeters]);

  // 2. Render and sync Employee Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed markers
    Object.keys(markersRef.current).forEach((empId) => {
      const exists = employees.some((e) => e.id === empId && e.latitude && e.longitude);
      if (!exists) {
        markersRef.current[empId].remove();
        delete markersRef.current[empId];
      }
    });

    // Update / Create markers
    employees.forEach((emp) => {
      if (!emp.latitude || !emp.longitude || !emp.isLocationSharingActive) {
        if (markersRef.current[emp.id]) {
          markersRef.current[emp.id].remove();
          delete markersRef.current[emp.id];
        }
        return;
      }

      const isInside = emp.status === 'INSIDE_OFFICE';
      const isStale = emp.freshness === 'STALE';
      const pinColor = isStale ? '#94A3B8' : isInside ? '#16A34A' : '#EA580C';

      const employeeIcon = L.divIcon({
        className: `custom-emp-pin-${emp.id}`,
        html: `
          <div style="background-color: ${pinColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2.5px solid #FFFFFF; cursor: pointer;">
            ${emp.displayName.charAt(0)}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div style="font-family: Inter, sans-serif; min-width: 170px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <b style="color: #0F172A; font-size: 13px;">${emp.displayName}</b>
            <span style="font-size: 10px; font-family: monospace; color: #64748B;">${emp.employeeCode}</span>
          </div>
          <p style="margin: 2px 0; color: #475569; font-size: 11px;">
            Status: <b style="color: ${isInside ? '#16A34A' : '#EA580C'};">${emp.status.replace('_', ' ')}</b>
          </p>
          <p style="margin: 2px 0; color: #64748B; font-size: 11px;">
            Distance: <b>${emp.distanceFromOffice || 0}m</b> ${isInside ? '(Inside)' : '(Outside)'}
          </p>
          <p style="margin: 2px 0; color: #64748B; font-size: 10px;">
            Accuracy: ±${emp.accuracy || 0}m • <i>${emp.freshness}</i>
          </p>
        </div>
      `;

      if (markersRef.current[emp.id]) {
        markersRef.current[emp.id].setLatLng([emp.latitude, emp.longitude]);
        markersRef.current[emp.id].setIcon(employeeIcon);
        markersRef.current[emp.id].setPopupContent(popupContent);
      } else {
        const marker = L.marker([emp.latitude, emp.longitude], { icon: employeeIcon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedEmployee(emp);
        });

        markersRef.current[emp.id] = marker;
      }
    });
  }, [employees]);

  // 3. Connect to Server-Sent Events (SSE) Live Stream
  useEffect(() => {
    const token = localStorage.getItem('system_hr_token');
    const eventSource = new EventSource(
      `/api/location/admin/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
    );

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'LOCATION_UPDATED') {
          // Instantly refresh query cache without full page reload
          queryClient.invalidateQueries({ queryKey: ['adminEmployeesLocation'] });
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  // Handle focus on employee
  const handleFocusEmployee = (emp: EmployeeLocationItem) => {
    setSelectedEmployee(emp);
    if (emp.latitude && emp.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 17, { duration: 1.2 });
      if (markersRef.current[emp.id]) {
        markersRef.current[emp.id].openPopup();
      }
    } else {
      showToast(`${emp.displayName} has no active coordinates available.`, 'info');
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'INSIDE') return emp.status === 'INSIDE_OFFICE';
    if (statusFilter === 'OUTSIDE') return emp.status === 'OUTSIDE_OFFICE';
    if (statusFilter === 'INACTIVE')
      return !emp.isLocationSharingActive || emp.status === 'LOCATION_INACTIVE' || emp.freshness === 'STALE';

    return true;
  });

  const insideCount = employees.filter((e) => e.status === 'INSIDE_OFFICE').length;
  const outsideCount = employees.filter((e) => e.status === 'OUTSIDE_OFFICE').length;
  const inactiveCount = employees.filter(
    (e) => !e.isLocationSharingActive || e.freshness === 'STALE'
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Live Employee Location
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time geofence monitoring and active work location verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              refetch();
              showToast('Location stream synchronized.');
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Inside Office
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-success-600 dark:text-success-400">{insideCount}</span>
            <span className="text-xs text-slate-400">within {office.radiusMeters}m</span>
          </div>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Outside Office
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-warning-600 dark:text-warning-400">{outsideCount}</span>
            <span className="text-xs text-slate-400">perimeter exit</span>
          </div>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Inactive / Stale
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">{inactiveCount}</span>
            <span className="text-xs text-slate-400">no active pings</span>
          </div>
        </Card>

        <Card padding="sm" className="space-y-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Geofence Radius
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{office.radiusMeters}m</span>
            <span className="text-xs text-slate-400">office perimeter</span>
          </div>
        </Card>
      </div>

      {/* Main Location Map & List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Interactive Map Viewport (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden shadow-subtle flex flex-col min-h-[520px]">
          <div className="p-3 border-b border-slate-100 dark:border-dark-border bg-slate-50/70 dark:bg-dark-elevated flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Live Geofence Radar ({office.name})
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> Live SSE
              </span>
            </div>
          </div>

          <div ref={mapContainerRef} className="flex-1 w-full min-h-[460px] z-10" />
        </div>

        {/* Employee List & Filters (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden shadow-subtle flex flex-col h-[520px]">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-100 dark:border-dark-border space-y-2 bg-slate-50/50 dark:bg-dark-elevated/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {(['ALL', 'INSIDE', 'OUTSIDE', 'INACTIVE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-tight transition-colors flex-shrink-0 ${
                    statusFilter === filter
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-dark-elevated text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-dark-border'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-border">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching employees found.
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmployee?.id === emp.id;
                const isInside = emp.status === 'INSIDE_OFFICE';

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleFocusEmployee(emp)}
                    className={`p-3 transition-all cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-brand-50/70 border-l-4 border-brand-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                          !emp.isLocationSharingActive
                            ? 'bg-slate-400'
                            : isInside
                            ? 'bg-success-600'
                            : 'bg-warning-600'
                        }`}
                      >
                        {emp.displayName.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {emp.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {emp.employeeCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {emp.department} •{' '}
                          {emp.distanceFromOffice !== null ? (
                            <span className="font-semibold text-slate-700">
                              {emp.distanceFromOffice}m away
                            </span>
                          ) : (
                            'No GPS'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <Badge status={emp.status} size="sm" />
                      {emp.lastUpdated && (
                        <span className="text-[9px] text-slate-400 block">
                          {new Date(emp.lastUpdated).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Employee Footer Bar */}
          {selectedEmployee && (
            <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {selectedEmployee.displayName}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {selectedEmployee.status.replace('_', ' ')}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={History}
                onClick={() => setIsHistoryModalOpen(true)}
              >
                History
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Employee Location History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Location History — ${selectedEmployee?.displayName || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800">Select Date</span>
            </div>
            <input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {isHistoryLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !historyData?.history || historyData.history.length === 0 ? (
              <EmptyState
                icon={Navigation}
                title="No location points"
                description={`No recorded location updates found for ${historyDate}.`}
              />
            ) : (
              historyData.history.map((h, idx) => (
                <div key={h.id || idx} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {new Date(h.recordedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-slate-700">
                      Distance: <b>{h.distanceFromOffice}m</b>
                    </span>
                    <span className="text-slate-400 text-[11px]">±{h.accuracy}m</span>
                  </div>
                  <Badge status={h.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
