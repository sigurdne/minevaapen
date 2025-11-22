import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { WeaponWithPrograms } from '@/src/database/weapons-repository';
import { useOrganizations } from '@/src/hooks/use-organizations';
import { usePrograms } from '@/src/hooks/use-programs';
import { useWeapons } from '@/src/hooks/use-weapons';

type ReserveFilterValue = 'any' | 'reserveOnly' | 'nonReserve';
type OwnershipFilterValue = 'all' | 'own' | 'loanIn' | 'loanOut';

const formatLoanDate = (value: string | null, locale: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return value;
  }

  const date = new Date(year, month - 1, day);

  try {
    const normalizedLocale = locale ? locale.replace(/_/g, '-') : 'nb-NO';
    return new Intl.DateTimeFormat(normalizedLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.warn('Failed to format loan date, returning ISO', error);
    return value;
  }
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [reserveFilter, setReserveFilter] = useState<ReserveFilterValue>('any');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilterValue>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [organizationsExpanded, setOrganizationsExpanded] = useState(false);
  const [programsExpanded, setProgramsExpanded] = useState(false);
  const [expandedWeaponIds, setExpandedWeaponIds] = useState<Set<string>>(new Set());

  const {
    organizations,
    loading: organizationsLoading,
    error: organizationsError,
  } = useOrganizations();
  const {
    programs,
    loading: programsLoading,
    error: programsError,
    refresh: refreshPrograms,
  } = usePrograms(selectedOrganizationId);
  const {
    weapons,
    loading: weaponsLoading,
    error: weaponsError,
    refresh: refreshWeapons,
  } = useWeapons({
    organizationId: selectedOrganizationId,
    programId: selectedProgramId,
    reserveFilter,
    ownershipFilter,
  });

  useFocusEffect(
    useCallback(() => {
      void refreshWeapons();
      void refreshPrograms();
    }, [refreshPrograms, refreshWeapons])
  );

  const colorScheme = useColorScheme();
  const filterHeaderThemeStyle =
    colorScheme === 'dark' ? styles.filterHeaderDark : styles.filterHeaderLight;
  const filterSummaryThemeStyle =
    colorScheme === 'dark' ? styles.filterSummaryDark : styles.filterSummaryLight;
  const cardThemeStyle = colorScheme === 'dark' ? styles.cardDark : styles.cardLight;

  const organizationOptions = useMemo(
    () => [
      { id: null, label: t('weapons.filters.organizations.all') },
      ...organizations.map((org) => ({
        id: org.id,
        label: org.shortName ? org.shortName : org.name,
      })),
    ],
    [organizations, t]
  );

  const programOptions = useMemo(
    () => [
      { id: null, label: t('weapons.filters.programs.all'), weaponCount: 0, reserveCount: 0 },
      ...programs.map((program) => ({
        id: program.id,
        label: program.name,
        weaponCount: program.weaponCount,
        reserveCount: program.reserveCount,
      })),
    ],
    [programs, t]
  );

  const reserveOptions = useMemo(
    () => [
      { value: 'any' as ReserveFilterValue, label: t('weapons.filters.reserve.any') },
      { value: 'reserveOnly' as ReserveFilterValue, label: t('weapons.filters.reserve.only') },
      { value: 'nonReserve' as ReserveFilterValue, label: t('weapons.filters.reserve.none') },
    ],
    [t]
  );

  const ownershipOptions = useMemo(
    () => [
      { value: 'own' as OwnershipFilterValue, label: t('weapons.filters.ownership.own') },
      { value: 'loanIn' as OwnershipFilterValue, label: t('weapons.filters.ownership.loanIn') },
      { value: 'loanOut' as OwnershipFilterValue, label: t('weapons.filters.ownership.loanOut') },
    ],
    [t]
  );

  const selectedOrganizationLabel = useMemo(() => {
    if (!selectedOrganizationId) {
      return null;
    }

    const match = organizationOptions.find((option) => option.id === selectedOrganizationId);
    return match?.label ?? selectedOrganizationId;
  }, [organizationOptions, selectedOrganizationId]);

  const selectedProgramLabel = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }

    const match = programOptions.find((option) => option.id === selectedProgramId);
    return match?.label ?? selectedProgramId;
  }, [programOptions, selectedProgramId]);

  const selectedProgramSummary = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }

    const match = programs.find((program) => program.id === selectedProgramId);
    if (!match) {
      return null;
    }

    return t('weapons.programSummary', {
      name: match.name,
      weaponCount: match.weaponCount,
      reserveCount: match.reserveCount,
    });
  }, [programs, selectedProgramId, t]);

  useEffect(() => {
    if (selectedOrganizationId) {
      setOrganizationsExpanded(true);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    if (selectedProgramId) {
      setProgramsExpanded(true);
    }
  }, [selectedProgramId]);

  const isLoading = organizationsLoading || programsLoading || weaponsLoading;
  const error = weaponsError ?? programsError ?? organizationsError;

  const handleSelectOrganization = useCallback(
    (id: string | null) => {
      setSelectedOrganizationId((previous) => {
        const next = previous === id ? null : id;
        return next;
      });
      setSelectedProgramId(null);
    },
    []
  );

  const handleSelectProgram = useCallback((id: string | null) => {
    setSelectedProgramId((previous) => (previous === id ? null : id));
  }, []);

  const handleSelectReserve = useCallback((value: ReserveFilterValue) => {
    setReserveFilter((previous) => (previous === value ? 'any' : value));
  }, []);

  const handleSelectOwnership = useCallback((value: OwnershipFilterValue) => {
    setOwnershipFilter((previous) => (previous === value ? 'all' : value));
  }, []);

  const toggleOrganizationsExpanded = useCallback(() => {
    setOrganizationsExpanded((prev) => !prev);
  }, []);

  const toggleProgramsExpanded = useCallback(() => {
    setProgramsExpanded((prev) => !prev);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshWeapons(), refreshPrograms()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrograms, refreshWeapons]);

  const toggleWeaponExpansion = useCallback((weaponId: string) => {
    setExpandedWeaponIds((prev) => {
      const next = new Set(prev);
      if (next.has(weaponId)) {
        next.delete(weaponId);
      } else {
        next.add(weaponId);
      }
      return next;
    });
  }, []);

  const renderWeapon = useCallback(
    ({ item }: { item: WeaponWithPrograms }) => {
      const isExpanded = expandedWeaponIds.has(item.id);
      const locale = i18n.language || 'nb-NO';
      const typeLabel = t(`weapons.types.${item.type}` as const, {
        defaultValue: item.type,
      });
      const approvedProgramId =
        item.programs.find((program) => program.status === 'approved')?.programId;
      const loanBadge =
        item.ownershipStatus === 'loanIn'
          ? t('weapons.card.loanInBadge')
          : item.ownershipStatus === 'loanOut'
          ? t('weapons.card.loanOutBadge')
          : null;
      const formattedLoanStart = formatLoanDate(item.loanStartDate, locale);
      const formattedLoanEnd = formatLoanDate(item.loanEndDate, locale);
      const showLoanInfo =
        item.ownershipStatus !== 'own' &&
        (item.loanContactName || formattedLoanStart || formattedLoanEnd);

      const manufacturerModel =
        item.manufacturer && item.model
          ? t('weapons.card.manufacturerModel', {
              manufacturer: item.manufacturer,
              model: item.model,
            })
          : item.manufacturer ?? item.model ?? null;

      return (
        <ThemedView
          style={[styles.card, cardThemeStyle]}
          lightColor="#ffffff"
          darkColor="rgba(255,255,255,0.05)"
        >
          <Pressable
            onPress={() => toggleWeaponExpansion(item.id)}
            style={styles.cardHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {item.displayName}
            </ThemedText>
            {isExpanded && (
              <View style={styles.cardBadgeColumn}>
                <ThemedText style={styles.typeBadge}>{typeLabel}</ThemedText>
                {loanBadge ? <ThemedText style={styles.loanBadge}>{loanBadge}</ThemedText> : null}
              </View>
            )}
          </Pressable>

          {isExpanded && (
            <>
              {manufacturerModel ? (
                <ThemedText style={styles.metaText}>{manufacturerModel}</ThemedText>
              ) : null}

              {item.serialNumber ? (
                <ThemedText style={styles.metaText}>
                  {t('weapons.card.serialNumber', { serial: item.serialNumber })}
                </ThemedText>
              ) : null}

              {showLoanInfo ? (
                <View style={styles.loanInfoBox}>
                  {item.loanContactName ? (
                    <ThemedText style={styles.loanInfoText}>
                      {t('weapons.card.loanContact', { name: item.loanContactName })}
                    </ThemedText>
                  ) : null}
                  {formattedLoanStart || formattedLoanEnd ? (
                    <ThemedText style={styles.loanInfoText}>
                      {t('weapons.card.loanPeriod', {
                        start: formattedLoanStart ?? t('weapons.card.loanDateUnknown'),
                        end: formattedLoanEnd ?? t('weapons.card.loanDateUnknown'),
                      })}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.programsContainer}>
                <ThemedText style={styles.programsTitle}>
                  {t('weapons.card.programsTitle')}
                </ThemedText>

                {item.programs.length === 0 ? (
                  <ThemedText style={styles.metaText}>{t('weapons.card.noPrograms')}</ThemedText>
                ) : (
                  item.programs.map((program) => (
                    <View
                      key={`${item.id}-${program.programId}`}
                      style={[
                        styles.programRow,
                        program.programId === approvedProgramId && styles.programRowApproved,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.programName,
                          program.programId === approvedProgramId && styles.programNameApproved,
                        ]}
                      >
                        {program.programName}
                      </ThemedText>
                      <View style={styles.programBadges}>
                        {program.programId === approvedProgramId ? (
                          <ThemedText style={styles.approvedBadge}>
                            {t('weapons.card.approvedBadge')}
                          </ThemedText>
                        ) : null}
                        {program.isReserve ? (
                          <ThemedText style={styles.reserveBadge}>
                            {t('weapons.card.reserveBadge')}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.cardActions}>
                <Link
                  href={{ pathname: '/weapon/manage', params: { weaponId: item.id } }}
                  asChild
                >
                  <Pressable style={styles.editButton}>
                    <ThemedText style={styles.editButtonText}>
                      {t('weapons.card.edit')}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </>
          )}
        </ThemedView>
      );
    },
    [cardThemeStyle, expandedWeaponIds, i18n.language, t, toggleWeaponExpansion]
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {t('weapons.title')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{t('weapons.subtitle')}</ThemedText>
        <Link href="/weapon/manage" asChild>
          <Pressable style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>
              {t('weapons.actions.add')}
            </ThemedText>
          </Pressable>
        </Link>
      </View>

      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Pressable
            onPress={toggleOrganizationsExpanded}
            style={[styles.filterHeader, filterHeaderThemeStyle]}
            accessibilityRole="button"
            accessibilityState={{ expanded: organizationsExpanded }}
          >
            <ThemedText type="subtitle" style={styles.filterTitle}>
              {t('weapons.filters.organizations.title')}
            </ThemedText>
            <ThemedText style={styles.filterToggleText}>
              {organizationsExpanded
                ? t('weapons.filters.toggle.hide')
                : t('weapons.filters.toggle.show')}
            </ThemedText>
          </Pressable>
          {!organizationsExpanded && selectedOrganizationLabel ? (
            <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
              {t('weapons.filters.selected', { value: selectedOrganizationLabel })}
            </ThemedText>
          ) : null}
          {organizationsExpanded ? (
            <View style={styles.filterBody}>
              <View style={styles.filterRow}>
                {organizationOptions.map((option) => (
                  <FilterChip
                    key={option.id ?? 'all-organizations'}
                    label={option.label}
                    selected={selectedOrganizationId === option.id}
                    onPress={() => handleSelectOrganization(option.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.filterGroup}>
          <Pressable
            onPress={toggleProgramsExpanded}
            style={[styles.filterHeader, filterHeaderThemeStyle]}
            accessibilityRole="button"
            accessibilityState={{ expanded: programsExpanded }}
          >
            <ThemedText type="subtitle" style={styles.filterTitle}>
              {t('weapons.filters.programs.title')}
            </ThemedText>
            <ThemedText style={styles.filterToggleText}>
              {programsExpanded
                ? t('weapons.filters.toggle.hide')
                : t('weapons.filters.toggle.show')}
            </ThemedText>
          </Pressable>
          {!programsExpanded ? (
            selectedProgramSummary ? (
              <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
                {selectedProgramSummary}
              </ThemedText>
            ) : selectedProgramLabel ? (
              <ThemedText style={[styles.filterSummary, filterSummaryThemeStyle]}>
                {t('weapons.filters.selected', { value: selectedProgramLabel })}
              </ThemedText>
            ) : null
          ) : null}
          {programsExpanded ? (
            <View style={styles.filterBody}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRowScroll}
              >
                {programOptions.map((option) => (
                  <FilterChip
                    key={option.id ?? 'all-programs'}
                    label={option.label}
                    selected={selectedProgramId === option.id}
                    onPress={() => handleSelectProgram(option.id)}
                  />
                ))}
              </ScrollView>
              {selectedProgramSummary ? (
                <ThemedText style={styles.programSummary}>{selectedProgramSummary}</ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.filterGroup}>
          <ThemedText type="subtitle" style={styles.filterTitle}>
            {t('weapons.filters.reserve.title')}
          </ThemedText>
          <View style={styles.filterRow}>
            {reserveOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={reserveFilter === option.value}
                onPress={() => handleSelectReserve(option.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <ThemedText type="subtitle" style={styles.filterTitle}>
            {t('weapons.filters.ownership.title')}
          </ThemedText>
          <View style={styles.filterRow}>
            {ownershipOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={ownershipFilter === option.value}
                onPress={() => handleSelectOwnership(option.value)}
              />
            ))}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel={t('common.loading')} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <ThemedText style={styles.retryText}>{t('common.retry')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={weapons}
          keyExtractor={(item) => item.id}
          renderItem={renderWeapon}
          contentContainerStyle={
            weapons.length === 0 ? [styles.center, styles.emptyContainer] : styles.listContent
          }
          ListEmptyComponent={<ThemedText>{t('weapons.list.empty')}</ThemedText>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="gray"
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  primaryButtonText: {
    fontWeight: '700',
  },
  filtersSection: {
    gap: 16,
  },
  filterGroup: {
    gap: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterHeaderDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterHeaderLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  filterTitle: {
    fontSize: 18,
  },
  filterToggleText: {
    fontWeight: '600',
    fontSize: 13,
    opacity: 0.75,
  },
  filterBody: {
    marginTop: 8,
    gap: 8,
  },
  filterSummary: {
    marginTop: 6,
    fontSize: 13,
  },
  filterSummaryDark: {
    color: 'rgba(226, 232, 240, 0.85)',
  },
  filterSummaryLight: {
    color: 'rgba(15, 23, 42, 0.75)',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterRowScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardLight: {
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: 'rgba(15, 23, 42, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardDark: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardBadgeColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  loanBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    overflow: 'hidden',
  },
  metaText: {
    opacity: 0.8,
  },
  loanInfoBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    gap: 4,
  },
  loanInfoText: {
    fontSize: 13,
    opacity: 0.85,
  },
  programsContainer: {
    gap: 6,
  },
  programsTitle: {
    fontWeight: '600',
    opacity: 0.9,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  programRowApproved: {
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  programName: {
    flex: 1,
    marginRight: 8,
  },
  programNameApproved: {
    fontWeight: '700',
  },
  programBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvedBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    overflow: 'hidden',
  },
  reserveBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    overflow: 'hidden',
  },
  programSummary: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  retryText: {
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  editButtonText: {
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: 'rgba(37, 99, 235, 0.5)',
  },
  chipText: {
    fontSize: 14,
    opacity: 0.85,
  },
  chipTextSelected: {
    fontWeight: '600',
    opacity: 1,
  },
  errorDetails: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
