import React, { useState, useEffect } from 'react';
import {
  Users2, UserPlus, Trash2, ShieldCheck,
  ExternalLink, X, RefreshCw, UserCheck
} from 'lucide-react';
import { familyService } from '../services/scholarsetuService';
import { useAuth } from '../context/AuthContext';

export const FamilyDiscoveryPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [schemesData, setSchemesData] = useState<any | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('CHILD');
  const [age, setAge] = useState<number>(16);
  const [gender, setGender] = useState('MALE');
  const [educationLevel, setEducationLevel] = useState('CLASS_11_12');
  const [occupation, setOccupation] = useState('Student');
  const [stateOrUt, setStateOrUt] = useState('Karnataka');
  const [annualIncome, setAnnualIncome] = useState<string>('200000');
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    if (!user) return;
    setLoadingMembers(true);
    try {
      const data = await familyService.getFamilyMembers();
      setMembers(data);
      if (data.length > 0) {
        setSelectedMember(data[0]);
        discoverSchemes(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const discoverSchemes = async (memberId: number) => {
    setLoadingSchemes(true);
    try {
      const res = await familyService.getFamilySchemes(memberId);
      setSchemesData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchemes(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await familyService.createFamilyMember({
        name,
        relationship,
        age: Number(age),
        gender,
        education_level: educationLevel,
        occupation,
        state_or_ut: stateOrUt,
        annual_income: Number(annualIncome || 0),
        is_disabled: isDisabled,
      });
      setShowAddModal(false);
      setName('');
      await loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add family member.');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Remove this family member profile?')) return;
    try {
      await familyService.deleteFamilyMember(id);
      if (selectedMember?.id === id) {
        setSelectedMember(null);
        setSchemesData(null);
      }
      await loadMembers();
    } catch (e) {
      alert('Failed to delete member.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#000000]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D2D2D4]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E7E7E7] border border-[#D2D2D4] text-[10px] font-bold text-[#000000] mb-2 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-[#FF634A]" />
            Feature 7: Multi-Generational Matching
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
            Family-Based Scheme Discovery
          </h1>
          <p className="text-xs text-[#000000]/60 mt-1">
            Discover tailored welfare programs for parents (pensions), children (scholarships), and farmers (PM-KISAN).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <UserPlus className="w-4 h-4" /> Add Family Member
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Family Member Cards */}
        <div className="lg:col-span-1 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#000000] pb-2 border-b border-[#D2D2D4]">
            Family Profiles ({members.length})
          </h2>

          {loadingMembers ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-[#FF634A] mx-auto mb-2" />
              <p className="text-xs text-[#000000]/60">Loading family members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-10">
              <Users2 className="w-8 h-8 text-[#000000]/30 mx-auto mb-2" />
              <p className="text-xs text-[#000000]/60">No family members registered yet.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-3 py-1.5 rounded-md bg-[#FFFFFF] border border-[#D2D2D4] text-xs font-bold text-[#000000] hover:bg-[#D2D2D4]"
              >
                Add Member
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMember(m);
                      discoverSchemes(m.id);
                    }}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#FF634A]'
                        : 'bg-[#FFFFFF] border-[#D2D2D4] hover:border-[#000000]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-[#000000]">{m.name}</p>
                      <p className="text-[10px] text-[#000000]/60">
                        {m.relationship} • Age: {m.age} • {m.occupation || 'Dependent'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(m.id);
                      }}
                      className="p-1 text-[#000000]/40 hover:text-[#FF634A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tailored Schemes Matching */}
        <div className="lg:col-span-2 space-y-4">
          {selectedMember ? (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D4] mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#000000]">
                    Eligible Opportunities for {selectedMember.name}
                  </h3>
                  <p className="text-[11px] text-[#000000]/60">
                    Targeted for {selectedMember.relationship.toLowerCase()} in {selectedMember.state_or_ut || 'All India'}
                  </p>
                </div>
              </div>

              {loadingSchemes ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF634A] mx-auto mb-2" />
                  <p className="text-xs text-[#000000]/60">Filtering schemes across ministries...</p>
                </div>
              ) : schemesData?.eligible_schemes?.length === 0 ? (
                <p className="text-xs text-[#000000]/60 text-center py-10">
                  No schemes match this profile's age and occupation criteria.
                </p>
              ) : (
                <div className="space-y-3">
                  {schemesData?.eligible_schemes?.map((scheme: any) => (
                    <div
                      key={scheme.id}
                      className="p-4 bg-[#FFFFFF] rounded-lg border border-[#D2D2D4] flex flex-col justify-between hover:border-[#000000] transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]">
                            {scheme.opportunity_type?.replace(/_/g, ' ') || 'SCHEME'}
                          </span>
                          <span className="text-[10px] font-bold text-[#FF634A] uppercase tracking-wider">
                            Match Found
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-[#000000] mb-1">{scheme.title}</h4>
                        <p className="text-[11px] text-[#000000]/60 mb-2 truncate">{scheme.provider}</p>
                        <p className="text-xs text-[#000000]/70 line-clamp-2 leading-relaxed mb-3">
                          {scheme.short_description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#D2D2D4] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#000000]">
                          {scheme.benefit_amount ? `₹${Number(scheme.benefit_amount).toLocaleString('en-IN')}` : scheme.benefit_description || 'Grant'}
                        </span>
                        <a
                          href={scheme.official_application_url || 'https://www.myscheme.gov.in'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs flex items-center gap-1"
                        >
                          Official Portal <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-12 text-center">
              <Users2 className="w-10 h-10 text-[#000000]/30 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#000000]">No Member Selected</h3>
              <p className="text-xs text-[#000000]/60 max-w-sm mx-auto mt-1">
                Select or add a family member on the left to discover relevant schemes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-sm">
          <div className="bg-[#F4F4F6] rounded-xl border border-[#D2D2D4] max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#D2D2D4] mb-4">
              <h3 className="text-sm font-bold text-[#000000]">Add Family Member Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#000000]/60 hover:text-[#000000]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#000000] mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  >
                    <option value="CHILD">Child / Student</option>
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="SPOUSE">Spouse</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="GRANDPARENT">Grandparent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Farmer, Student, Retired..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#000000] mb-1">Annual Income</label>
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-md focus:border-[#FF634A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D2D2D4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#000000]/70 hover:bg-[#E7E7E7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#FF634A] hover:bg-[#E5533D] text-[#FFFFFF] font-bold text-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
