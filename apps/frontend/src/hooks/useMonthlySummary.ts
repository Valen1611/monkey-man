import { useQuery } from '@tanstack/react-query';
import { monthlySummaryService } from '../services/monthlySummaryService';

export function useMonthlySummary(month: string) {
    return useQuery({
        queryKey: ['monthlySummary', month],
        queryFn: () => monthlySummaryService.getMonthlySummary(month),
        enabled: !!month
    });
}
