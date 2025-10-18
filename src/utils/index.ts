type DateLike = string | number | Date | null | undefined;

export function formatRelativeTime(dateLike: DateLike): string {
	if (!dateLike) {
		return '';
	}

	const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffSeconds = Math.round(diffMs / 1000);

	const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['year', 60 * 60 * 24 * 365],
		['month', 60 * 60 * 24 * 30],
		['week', 60 * 60 * 24 * 7],
		['day', 60 * 60 * 24],
		['hour', 60 * 60],
		['minute', 60],
		['second', 1]
	];

	const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

	for (const [unit, secondsInUnit] of units) {
		if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
			const value = Math.round(diffSeconds / secondsInUnit);
			return formatter.format(value, unit);
		}
	}

	return '';
}

export function truncate(text: string, maxLength = 80): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}
