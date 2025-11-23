import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteWeapon, upsertWeapon } from '@/src/database/weapons-repository';
import { useOrganizations } from '@/src/hooks/use-organizations';
import { usePrograms } from '@/src/hooks/use-programs';
import { useWeapon } from '@/src/hooks/use-weapon';

const weaponTypes = ['pistol', 'revolver', 'rifle', 'shotgun'] as const;

const operationModes = ['helautomatisk', 'halvautomatisk', 'manuell', 'enkeltskudd'] as const;

type OperationMode = (typeof operationModes)[number];

type WeaponType = (typeof weaponTypes)[number];

type OwnershipStatus = 'own' | 'loanIn' | 'loanOut';

type ProgramSelection = {
  isReserve: boolean;
  isApproved: boolean;
};

type ProgramSelectionMap = Record<string, ProgramSelection>;

type LocalParams = {
  weaponId?: string;
};

const normalizeSelectionMap = (
  input: ProgramSelectionMap,
  preferredApprovedId?: string | null
): ProgramSelectionMap => {
  let approvedProgramId = preferredApprovedId ?? null;

  if (approvedProgramId && !(input[approvedProgramId]?.isApproved)) {
    approvedProgramId = null;
  }

  if (!approvedProgramId) {
    for (const [id, selection] of Object.entries(input)) {
      if (selection.isApproved) {
        approvedProgramId = id;
        break;
      }
    }
  }

  const normalizedEntries = Object.entries(input).map(([id, selection]) => {
    const isApproved = Boolean(
      approvedProgramId && approvedProgramId === id && selection.isApproved
    );
    const isReserve = isApproved ? selection.isReserve : false;

    const normalizedSelection: ProgramSelection = { isApproved, isReserve };
    return [id, normalizedSelection];
  });

  return Object.fromEntries(normalizedEntries) as ProgramSelectionMap;
};

const areSelectionMapsEqual = (a: ProgramSelectionMap, b: ProgramSelectionMap): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const left = a[key];
    const right = b[key];
    if (!right || left.isApproved !== right.isApproved || left.isReserve !== right.isReserve) {
      return false;
    }
  }

  return true;
};

const createWeaponId = () => `weapon-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

const ownershipStatusOptions: OwnershipStatus[] = ['own', 'loanIn', 'loanOut'];

const toIsoDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatLoanDateLabel = (value: string | null, locale: string, placeholder: string) => {
  if (!value) {
    return placeholder;
  }

  const parsed = parseIsoDate(value);
  if (!parsed) {
    return placeholder;
  }

  try {
    const normalizedLocale = locale ? locale.replace(/_/g, '-') : 'nb-NO';
    return new Intl.DateTimeFormat(normalizedLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(parsed);
  } catch (error) {
    console.warn('Failed to format loan date, falling back to ISO', error);
    return value;
  }
};

export default function ManageWeaponScreen() {
  const { weaponId } = useLocalSearchParams<LocalParams>();
  const isEditMode = typeof weaponId === 'string' && weaponId.length > 0;

  const { t, i18n } = useTranslation();
  const router = useRouter();

  const { weapon, loading: weaponLoading, error: weaponError } = useWeapon(weaponId);
  const {
    organizations,
    loading: organizationsLoading,
    error: organizationsError,
  } = useOrganizations();
  const memberOrganizations = useMemo(
    () => organizations.filter((org) => org.isMember),
    [organizations]
  );
  const memberOrganizationIds = useMemo(
    () => memberOrganizations.map((org) => org.id),
    [memberOrganizations]
  );
  const membershipUnavailable = !organizationsLoading && memberOrganizationIds.length === 0;
  const {
    programs,
    loading: programsLoading,
    error: programsError,
    refresh: refreshPrograms,
  } = usePrograms({ allowedOrganizationIds: memberOrganizationIds });

  const [displayName, setDisplayName] = useState('');
  const [weaponType, setWeaponType] = useState<WeaponType>('pistol');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionPrice, setAcquisitionPrice] = useState('');
  const [weaponCardRef, setWeaponCardRef] = useState('');
  const [operationMode, setOperationMode] = useState<OperationMode | ''>('');
  const [caliber, setCaliber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<ProgramSelectionMap>({});
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus>('own');
  const [loanContactName, setLoanContactName] = useState('');
  const [loanStartDate, setLoanStartDate] = useState<string | null>(null);
  const [loanEndDate, setLoanEndDate] = useState<string | null>(null);
  const [isShowingLoanStartPicker, setIsShowingLoanStartPicker] = useState(false);
  const [isShowingLoanEndPicker, setIsShowingLoanEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const colorScheme = useColorScheme();
  const inputThemeStyle = colorScheme === 'dark' ? styles.inputDark : styles.inputLight;
  const placeholderColor =
    colorScheme === 'dark' ? 'rgba(248, 250, 252, 0.6)' : 'rgba(15, 23, 42, 0.5)';
  const switchTrackColor =
    colorScheme === 'dark'
      ? { false: 'rgba(148, 163, 184, 0.4)', true: '#60a5fa' }
      : { false: 'rgba(148, 163, 184, 0.5)', true: '#2563eb' };
  const switchThumbColor = colorScheme === 'dark' ? '#f8fafc' : '#1f2937';
  const programRowThemeStyle =
    colorScheme === 'dark' ? styles.programRowDark : styles.programRowLight;
  const chipThemeStyle = colorScheme === 'dark' ? styles.chipDark : styles.chipLight;
  const dividerThemeStyle =
    colorScheme === 'dark' ? styles.sectionDividerDark : styles.sectionDividerLight;
  const programGroupHeaderThemeStyle =
    colorScheme === 'dark' ? styles.programGroupHeaderDark : styles.programGroupHeaderLight;

  useEffect(() => {
    if (!isEditMode || !weapon) {
      return;
    }

    setDisplayName(weapon.displayName);
    setWeaponType(weapon.type as WeaponType);
    setManufacturer(weapon.manufacturer ?? '');
    setModel(weapon.model ?? '');
    setSerialNumber(weapon.serialNumber ?? '');
    setAcquisitionDate(weapon.acquisitionDate ?? '');
    setAcquisitionPrice(
      weapon.acquisitionPrice !== null && weapon.acquisitionPrice !== undefined
        ? String(weapon.acquisitionPrice)
        : ''
    );
    setWeaponCardRef(weapon.weaponCardRef ?? '');
    setOperationMode((weapon.operationMode as OperationMode) ?? '');
    setCaliber(weapon.caliber ?? '');
    setNotes(weapon.notes ?? '');
    setOwnershipStatus((weapon.ownershipStatus as OwnershipStatus) ?? 'own');
    setLoanContactName(weapon.loanContactName ?? '');
    setLoanStartDate(weapon.loanStartDate ?? null);
    setLoanEndDate(weapon.loanEndDate ?? null);
    let approvedProgramId: string | null = null;
    const initialSelections = weapon.programs.reduce<ProgramSelectionMap>((acc, program) => {
      const isInitiallyApproved = program.status === 'approved';
      if (isInitiallyApproved && approvedProgramId === null) {
        approvedProgramId = program.programId;
      }

      acc[program.programId] = {
        isReserve: program.isReserve,
        isApproved: isInitiallyApproved && approvedProgramId === program.programId,
      };
      return acc;
    }, {});

    const normalizedSelections = normalizeSelectionMap(initialSelections, approvedProgramId);
    setSelectedPrograms(normalizedSelections);
  }, [isEditMode, weapon]);

  const groupedPrograms = useMemo(() => {
    const organizationById = new Map(memberOrganizations.map((org) => [org.id, org]));
    const grouped = new Map<string, { id: string; name: string; programs: typeof programs }>();

    for (const program of programs) {
      const match = organizationById.get(program.organizationId);
      const orgKey = match?.id ?? 'other';
      const existing = grouped.get(orgKey);

      if (existing) {
        existing.programs.push(program);
      } else {
        grouped.set(orgKey, {
          id: orgKey,
          name: match?.name ?? program.organizationId,
          programs: [program],
        });
      }
    }

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      programs: [...group.programs].sort((a, b) => a.name.localeCompare(b.name, 'nb')),
    }));
  }, [memberOrganizations, programs]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = {};
      groupedPrograms.forEach((group) => {
        const hasSelected = group.programs.some((program) => Boolean(selectedPrograms[program.id]));
        next[group.id] = prev[group.id] ?? hasSelected;
      });
      return next;
    });
  }, [groupedPrograms, selectedPrograms]);

  const handleOwnershipChange = useCallback((status: OwnershipStatus) => {
    setOwnershipStatus(status);

    if (status === 'own') {
      setLoanContactName('');
      setLoanStartDate(null);
      setLoanEndDate(null);
      setIsShowingLoanStartPicker(false);
      setIsShowingLoanEndPicker(false);
    }
  }, []);

  const openLoanStartPicker = useCallback(() => {
    setIsShowingLoanStartPicker((previous) => {
      const next = !previous;
      if (Platform.OS === 'ios' && next) {
        setIsShowingLoanEndPicker(false);
      }
      return next;
    });
  }, []);

  const openLoanEndPicker = useCallback(() => {
    setIsShowingLoanEndPicker((previous) => {
      const next = !previous;
      if (Platform.OS === 'ios' && next) {
        setIsShowingLoanStartPicker(false);
      }
      return next;
    });
  }, []);

  const handleLoanStartChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setIsShowingLoanStartPicker(false);
      }

      if (event.type !== 'set' || !date) {
        return;
      }

      const isoValue = toIsoDateString(date);
      setLoanStartDate(isoValue);

      if (loanEndDate && loanEndDate < isoValue) {
        setLoanEndDate(isoValue);
      }
    },
    [loanEndDate]
  );

  const handleLoanEndChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setIsShowingLoanEndPicker(false);
      }

      if (event.type !== 'set' || !date) {
        return;
      }

      const isoValue = toIsoDateString(date);
      setLoanEndDate(isoValue);

      if (loanStartDate && loanStartDate > isoValue) {
        setLoanStartDate(isoValue);
      }
    },
    [loanStartDate]
  );

  const handleClearLoanStart = useCallback(() => {
    setLoanStartDate(null);
  }, []);

  const handleClearLoanEnd = useCallback(() => {
    setLoanEndDate(null);
  }, []);

  const toggleProgramSelection = useCallback((programId: string) => {
    setSelectedPrograms((prev) => {
      const next = { ...prev };
      if (next[programId]) {
        delete next[programId];
      } else {
        next[programId] = { isReserve: false, isApproved: false };
      }
      const normalized = normalizeSelectionMap(next);
      return areSelectionMapsEqual(prev, normalized) ? prev : normalized;
    });
  }, []);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const setProgramReserve = useCallback((programId: string, isReserve: boolean) => {
    setSelectedPrograms((prev) => {
      const existing = prev[programId];
      if (!existing) {
        return prev;
      }

      const updated: ProgramSelectionMap = {
        ...prev,
        [programId]: {
          ...existing,
          isReserve,
          isApproved: isReserve ? true : existing.isApproved,
        },
      };

      const normalized = normalizeSelectionMap(updated, isReserve ? programId : undefined);
      return areSelectionMapsEqual(prev, normalized) ? prev : normalized;
    });
  }, []);

  const setProgramApproved = useCallback((programId: string, isApproved: boolean) => {
    setSelectedPrograms((prev) => {
      const existing = prev[programId];
      if (!existing) {
        return prev;
      }

      const updated: ProgramSelectionMap = {
        ...prev,
        [programId]: {
          ...existing,
          isApproved,
          isReserve: isApproved ? existing.isReserve : false,
        },
      };

      const normalized = normalizeSelectionMap(updated, isApproved ? programId : undefined);
      return areSelectionMapsEqual(prev, normalized) ? prev : normalized;
    });
  }, []);

  useEffect(() => {
    setSelectedPrograms((prev) => {
      const allowedIds = new Set(programs.map((program) => program.id));
      const filteredEntries = Object.entries(prev).filter(([programId]) =>
        allowedIds.has(programId)
      );
      if (filteredEntries.length === Object.keys(prev).length) {
        return prev;
      }
      return Object.fromEntries(filteredEntries);
    });
  }, [programs]);

  const resetForm = useCallback(() => {
    setDisplayName('');
    setWeaponType('pistol');
    setManufacturer('');
    setModel('');
    setSerialNumber('');
    setAcquisitionDate('');
    setAcquisitionPrice('');
    setWeaponCardRef('');
    setOperationMode('');
    setCaliber('');
    setNotes('');
    setSelectedPrograms({});
    setOwnershipStatus('own');
    setLoanContactName('');
    setLoanStartDate(null);
    setLoanEndDate(null);
    setIsShowingLoanStartPicker(false);
    setIsShowingLoanEndPicker(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) {
      Alert.alert(t('weaponForm.validation.displayName'));
      return;
    }

    if (!weaponType) {
      Alert.alert(t('weaponForm.validation.type'));
      return;
    }

    setSaving(true);

    try {
      const parsedPrice = acquisitionPrice.trim().length
        ? Number(acquisitionPrice.replace(',', '.'))
        : null;
      const price = Number.isNaN(parsedPrice) ? null : parsedPrice;

      const normalizedOwnership = ownershipStatus;
      const normalizedLoanContact =
        normalizedOwnership === 'own' ? null : loanContactName.trim() || null;
      const normalizedLoanStart = normalizedOwnership === 'own' ? null : loanStartDate;
      const normalizedLoanEnd = normalizedOwnership === 'own' ? null : loanEndDate;

      const payload = {
        id: isEditMode && weaponId ? weaponId : createWeaponId(),
        displayName: displayName.trim(),
        type: weaponType,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        acquisitionDate: acquisitionDate.trim() || null,
        acquisitionPrice: price,
        weaponCardRef: weaponCardRef.trim() || null,
        operationMode: operationMode || null,
        caliber: caliber.trim() || null,
        notes: notes.trim() || null,
        ownershipStatus: normalizedOwnership,
        loanContactName: normalizedLoanContact,
        loanStartDate: normalizedLoanStart,
        loanEndDate: normalizedLoanEnd,
        programs: Object.entries(selectedPrograms).map(([programId, value]) => ({
          programId,
          isReserve: value.isApproved ? value.isReserve : false,
          status: value.isApproved ? ('approved' as const) : ('pending' as const),
        })),
      };

      await upsertWeapon(payload);
      await refreshPrograms();

      if (!isEditMode) {
        resetForm();
      }

      router.back();
    } catch (error) {
      console.warn('Failed to save weapon', error);
      Alert.alert(t('weaponForm.feedback.error'));
    } finally {
      setSaving(false);
    }
  }, [
    acquisitionDate,
    acquisitionPrice,
    caliber,
    displayName,
    isEditMode,
    manufacturer,
    model,
    notes,
    ownershipStatus,
    loanContactName,
    loanEndDate,
    loanStartDate,
    operationMode,
    refreshPrograms,
    resetForm,
    router,
    selectedPrograms,
    serialNumber,
    t,
    weaponCardRef,
    weaponId,
    weaponType,
  ]);

  const handleDelete = useCallback(() => {
    if (!isEditMode || !weaponId) {
      return;
    }

    Alert.alert(t('weaponForm.delete.confirmTitle'), t('weaponForm.delete.confirmMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('weaponForm.delete.confirmButton'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteWeapon(weaponId);
            await refreshPrograms();
            router.back();
          } catch (error) {
            console.warn('Failed to delete weapon', error);
            Alert.alert(t('weaponForm.feedback.error'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [isEditMode, refreshPrograms, router, t, weaponId]);

  const isBusy =
    saving ||
    deleting ||
    weaponLoading ||
    programsLoading ||
    organizationsLoading;

  const loadError = weaponError ?? programsError ?? organizationsError;

  if (isEditMode && !weapon && !weaponLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('weaponForm.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  if (isBusy && !weapon && isEditMode) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel={t('common.loading')} />
      </ThemedView>
    );
  }

  if (loadError) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText accessibilityRole="alert">{loadError.message}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {isEditMode ? t('weaponForm.title.edit') : t('weaponForm.title.new')}
          </ThemedText>
          <ThemedText style={styles.subtitle}>{t('weaponForm.description')}</ThemedText>
        </View>

        <View style={styles.fieldSet}>
          <FormField label={t('weaponForm.fields.displayName')}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={[styles.input, inputThemeStyle]}
              placeholder={t('weaponForm.fields.displayName')}
              autoCapitalize="words"
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.type')}>
            <View style={styles.chipRow}>
              {weaponTypes.map((typeOption) => (
                <Pressable
                  key={typeOption}
                  onPress={() => setWeaponType(typeOption)}
                  style={[styles.chip, chipThemeStyle, weaponType === typeOption && styles.chipSelected]}
                >
                  <ThemedText
                    style={[styles.chipLabel, weaponType === typeOption && styles.chipLabelSelected]}
                  >
                    {t(`weapons.types.${typeOption}` as const)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </FormField>

          <FormField label={t('weaponForm.fields.ownershipStatus')}>
            <View style={styles.chipRow}>
              {ownershipStatusOptions.map((statusOption) => (
                <Pressable
                  key={statusOption}
                  onPress={() => handleOwnershipChange(statusOption)}
                  style={[
                    styles.chip,
                    chipThemeStyle,
                    ownershipStatus === statusOption && styles.chipSelected,
                  ]}
                  accessibilityState={{ selected: ownershipStatus === statusOption }}
                  disabled={saving}
                >
                  <ThemedText
                    style={[
                      styles.chipLabel,
                      ownershipStatus === statusOption && styles.chipLabelSelected,
                    ]}
                  >
                    {t(`weaponForm.ownership.options.${statusOption}` as const)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.fieldHint}>{t('weaponForm.ownership.help')}</ThemedText>
          </FormField>

          {ownershipStatus !== 'own' ? (
            <View
              style={[
                styles.loanSection,
                colorScheme === 'dark' ? styles.loanSectionDark : styles.loanSectionLight,
              ]}
            >
              <FormField label={t('weaponForm.loan.contact')} containerStyle={styles.loanFormField}>
                <TextInput
                  value={loanContactName}
                  onChangeText={setLoanContactName}
                  style={[styles.input, inputThemeStyle]}
                  placeholder={t('weaponForm.loan.contactPlaceholder')}
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="words"
                  editable={!saving}
                />
              </FormField>

              <View style={styles.loanDatesRow}>
                <FormField
                  label={t('weaponForm.loan.start')}
                  containerStyle={[styles.loanDateColumn, styles.loanFormField]}
                >
                  <View style={styles.dateButtonRow}>
                    <Pressable
                      onPress={openLoanStartPicker}
                      style={[styles.chip, styles.dateButton, chipThemeStyle]}
                      disabled={saving}
                    >
                      <ThemedText style={styles.dateButtonText}>
                        {formatLoanDateLabel(
                          loanStartDate,
                          i18n.language,
                          t('weaponForm.loan.datePlaceholder')
                        )}
                      </ThemedText>
                    </Pressable>
                    {loanStartDate ? (
                      <Pressable onPress={handleClearLoanStart} disabled={saving}>
                        <ThemedText style={styles.clearDateText}>
                          {t('weaponForm.loan.clearDate')}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                  {isShowingLoanStartPicker ? (
                    <DateTimePicker
                      value={parseIsoDate(loanStartDate) ?? new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleLoanStartChange}
                      maximumDate={parseIsoDate(loanEndDate) ?? undefined}
                    />
                  ) : null}
                </FormField>

                <FormField
                  label={t('weaponForm.loan.end')}
                  containerStyle={[styles.loanDateColumn, styles.loanFormField]}
                >
                  <View style={styles.dateButtonRow}>
                    <Pressable
                      onPress={openLoanEndPicker}
                      style={[styles.chip, styles.dateButton, chipThemeStyle]}
                      disabled={saving}
                    >
                      <ThemedText style={styles.dateButtonText}>
                        {formatLoanDateLabel(
                          loanEndDate,
                          i18n.language,
                          t('weaponForm.loan.datePlaceholder')
                        )}
                      </ThemedText>
                    </Pressable>
                    {loanEndDate ? (
                      <Pressable onPress={handleClearLoanEnd} disabled={saving}>
                        <ThemedText style={styles.clearDateText}>
                          {t('weaponForm.loan.clearDate')}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                  {isShowingLoanEndPicker ? (
                    <DateTimePicker
                      value={parseIsoDate(loanEndDate) ?? new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleLoanEndChange}
                      minimumDate={parseIsoDate(loanStartDate) ?? undefined}
                    />
                  ) : null}
                </FormField>
              </View>
            </View>
          ) : null}

          <FormField label={t('weaponForm.fields.manufacturer')}>
            <TextInput
              value={manufacturer}
              onChangeText={setManufacturer}
              style={[styles.input, inputThemeStyle]}
              placeholder={t('weaponForm.fields.manufacturer')}
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.model')}>
            <TextInput
              value={model}
              onChangeText={setModel}
              style={[styles.input, inputThemeStyle]}
              placeholder={t('weaponForm.fields.model')}
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.serialNumber')}>
            <TextInput
              value={serialNumber}
              onChangeText={setSerialNumber}
              style={[styles.input, inputThemeStyle]}
              placeholder={t('weaponForm.fields.serialNumber')}
              autoCapitalize="characters"
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.acquisitionDate')}>
            <TextInput
              value={acquisitionDate}
              onChangeText={setAcquisitionDate}
              style={[styles.input, inputThemeStyle]}
              placeholder="2024-01-31"
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.acquisitionPrice')}>
            <TextInput
              value={acquisitionPrice}
              onChangeText={setAcquisitionPrice}
              style={[styles.input, inputThemeStyle]}
              keyboardType="decimal-pad"
              placeholder="19000"
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.weaponCardRef')}>
            <TextInput
              value={weaponCardRef}
              onChangeText={setWeaponCardRef}
              style={[styles.input, inputThemeStyle]}
              placeholder={t('weaponForm.fields.weaponCardRef')}
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.operationMode')}>
            <View style={styles.chipRow}>
              {operationModes.map((modeOption) => (
                <Pressable
                  key={modeOption}
                  onPress={() => setOperationMode(modeOption)}
                  style={[styles.chip, chipThemeStyle, operationMode === modeOption && styles.chipSelected]}
                >
                  <ThemedText
                    style={[styles.chipLabel, operationMode === modeOption && styles.chipLabelSelected]}
                  >
                    {t(`weaponForm.operationModes.${modeOption}` as const)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </FormField>

          <FormField label={t('weaponForm.fields.caliber')}>
            <TextInput
              value={caliber}
              onChangeText={setCaliber}
              style={[styles.input, inputThemeStyle]}
              placeholder="9 mm"
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>

          <FormField label={t('weaponForm.fields.notes')}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, inputThemeStyle, styles.notesInput]}
              placeholder={t('weaponForm.fields.notes')}
              multiline
              numberOfLines={4}
              placeholderTextColor={placeholderColor}
              editable={!saving}
            />
          </FormField>
        </View>

        <View style={[styles.sectionDivider, dividerThemeStyle]} />

        <View style={styles.programSection}>
          <ThemedText type="title" style={styles.sectionTitle}>
            {t('weaponForm.programs.title')}
          </ThemedText>
          <ThemedText style={styles.sectionSubtitle}>{t('weaponForm.programs.help')}</ThemedText>

          {membershipUnavailable || groupedPrograms.length === 0 ? (
            <ThemedText style={styles.membershipNotice}>
              {t('weaponForm.memberships.empty')}
            </ThemedText>
          ) : (
            groupedPrograms.map((group) => {
              const isExpanded = expandedGroups[group.id] ?? false;
              return (
                <View key={group.id} style={styles.programGroup}>
                  <Pressable
                    onPress={() => toggleGroupExpansion(group.id)}
                    style={[styles.programGroupHeader, programGroupHeaderThemeStyle]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    disabled={saving}
                  >
                    <ThemedText style={styles.programGroupTitle}>{group.name}</ThemedText>
                    <ThemedText style={styles.programGroupToggle}>
                      {isExpanded
                        ? t('weaponForm.programs.collapse')
                        : t('weaponForm.programs.expand')}
                    </ThemedText>
                  </Pressable>
                  {isExpanded ? (
                    <View style={styles.programGroupBody}>
                      {group.programs.map((program) => {
                      const selection = selectedPrograms[program.id];
                      const selected = Boolean(selection);
                      const isApproved = selection?.isApproved ?? false;
                      const typedCategory =
                        program.weaponCategory !== null &&
                        (weaponTypes as readonly string[]).includes(
                          program.weaponCategory as WeaponType
                        )
                          ? (program.weaponCategory as WeaponType)
                          : null;
                      const categoryLabel = typedCategory
                        ? t(`weapons.types.${typedCategory}` as const, {
                            defaultValue: typedCategory,
                          })
                        : program.weaponCategory;
                      const isRecommended = typedCategory
                        ? typedCategory === weaponType
                        : false;
                      return (
                        <Pressable
                          key={program.id}
                          onPress={() => toggleProgramSelection(program.id)}
                          style={[
                            styles.programRow,
                            programRowThemeStyle,
                            selected &&
                              (colorScheme === 'dark'
                                ? styles.programRowSelectedDark
                                : styles.programRowSelectedLight),
                          ]}
                          disabled={saving}
                        >
                          <View style={styles.programInfo}>
                            <ThemedText style={styles.programName}>{program.name}</ThemedText>
                            <ThemedText style={styles.programUsage}>
                              {t('weaponForm.programs.usage', {
                                weaponCount: program.weaponCount,
                                reserveCount: program.reserveCount,
                              })}
                            </ThemedText>
                            {categoryLabel ? (
                              <ThemedText
                                style={[
                                  styles.programTag,
                                  isRecommended
                                    ? styles.programTagPositive
                                    : styles.programTagNeutral,
                                ]}
                              >
                                {isRecommended
                                  ? t('weaponForm.programs.recommended', {
                                      type: categoryLabel,
                                    })
                                  : t('weaponForm.programs.otherType', {
                                      type: categoryLabel,
                                    })}
                              </ThemedText>
                            ) : null}
                          </View>
                          {selected ? (
                            <View style={styles.programControls}>
                              <View style={styles.approvalToggle}>
                                <ThemedText style={styles.approvalLabel}>
                                  {t('weaponForm.programs.status.approved')}
                                </ThemedText>
                                <Switch
                                  value={isApproved}
                                  onValueChange={(value) => setProgramApproved(program.id, value)}
                                  trackColor={switchTrackColor}
                                  thumbColor={switchThumbColor}
                                  ios_backgroundColor={switchTrackColor.false}
                                  disabled={saving}
                                />
                              </View>
                              <View style={styles.reserveToggle}>
                                <ThemedText style={styles.reserveLabel}>
                                  {t('weaponForm.programs.reserveLabel')}
                                </ThemedText>
                                <Switch
                                  value={selection?.isReserve ?? false}
                                  onValueChange={(value) => setProgramReserve(program.id, value)}
                                  trackColor={switchTrackColor}
                                  thumbColor={switchThumbColor}
                                  ios_backgroundColor={switchTrackColor.false}
                                  disabled={saving}
                                />
                              </View>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.buttonGroup}>
          <Pressable
            onPress={handleSave}
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                {t('weaponForm.actions.save')}
              </ThemedText>
            )}
          </Pressable>

          {isEditMode ? (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" />
              ) : (
                <ThemedText style={styles.deleteButtonText}>
                  {t('weaponForm.actions.delete')}
                </ThemedText>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

function FormField({ label, children, containerStyle }: FormFieldProps) {
  return (
    <View style={[styles.formField, containerStyle]}>
      <ThemedText style={styles.formLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  membershipNotice: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#b45309',
    marginTop: 8,
  },
  fieldSet: {
    gap: 16,
  },
  formField: {
    gap: 8,
  },
  formLabel: {
    fontWeight: '600',
    opacity: 0.9,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  inputDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.24)',
    color: '#f8fafc',
  },
  inputLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderColor: 'rgba(15, 23, 42, 0.12)',
    color: '#111827',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipDark: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipLight: {
    borderColor: 'rgba(15, 23, 42, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
  },
  chipSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderColor: 'rgba(37, 99, 235, 0.45)',
  },
  chipLabel: {
    opacity: 0.85,
  },
  chipLabelSelected: {
    fontWeight: '600',
    opacity: 1,
  },
  fieldHint: {
    fontSize: 13,
    opacity: 0.65,
  },
  loanSection: {
    gap: 16,
    padding: 16,
    borderRadius: 16,
  },
  loanSectionDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  loanSectionLight: {
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  loanFormField: {
    flex: 1,
  },
  loanDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  loanDateColumn: {
    flex: 1,
    minWidth: 160,
  },
  dateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  clearDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  sectionDivider: {
    height: 1,
    borderRadius: 1,
  },
  sectionDividerDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionDividerLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.07)',
  },
  programSection: {
    gap: 16,
  },
  sectionTitle: {
    textAlign: 'center',
  },
  sectionSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  programGroup: {
    gap: 8,
  },
  programGroupHeader: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programGroupHeaderDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  programGroupHeaderLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  programGroupTitle: {
    fontWeight: '600',
    opacity: 0.9,
  },
  programGroupToggle: {
    fontWeight: '600',
    fontSize: 13,
    opacity: 0.75,
  },
  programGroupBody: {
    gap: 12,
  },
  programRow: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
  },
  programRowDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  programRowLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  programRowSelectedDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderColor: 'rgba(37, 99, 235, 0.35)',
  },
  programRowSelectedLight: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  programInfo: {
    gap: 4,
  },
  programName: {
    fontWeight: '600',
  },
  programUsage: {
    opacity: 0.7,
    fontSize: 12,
  },
  programTag: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  programTagPositive: {
    color: '#22c55e',
  },
  programTagNeutral: {
    color: 'rgba(148, 163, 184, 0.85)',
  },
  programControls: {
    gap: 12,
    marginTop: 12,
  },
  approvalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  approvalLabel: {
    fontWeight: '600',
  },
  reserveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reserveLabel: {
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
  },
  primaryButtonText: {
    fontWeight: '700',
  },
  deleteButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  deleteButtonText: {
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
