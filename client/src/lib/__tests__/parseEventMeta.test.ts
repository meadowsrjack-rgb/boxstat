
import { parseEventMeta, EventType } from '../parseEventMeta';

describe('parseEventMeta', () => {
  const mockEvent = (summary: string, description?: string, location?: string) => ({
    id: 'test-id',
    summary,
    description,
    location,
    start: { dateTime: '2024-01-15T10:00:00Z' },
    end: { dateTime: '2024-01-15T11:00:00Z' }
  });

  describe('event type classification', () => {
    it('should classify skills events', () => {
      const event = mockEvent('FNH 3rd-4th Skills — Coach Malia — Momentous');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('skills');
    });

    it('should classify practice events', () => {
      const event = mockEvent('11U Red Practice');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('practice');
    });

    it('should classify game events', () => {
      const event = mockEvent('HS Black vs Northwood (Game)');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('game');
    });

    it('should classify tournament events', () => {
      const event = mockEvent('Tournament @ Sportsplex');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('tournament');
    });

    it('should classify camp events', () => {
      const event = mockEvent('Summer Basketball Camp');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('camp');
    });

    it('should default to practice for unknown types', () => {
      const event = mockEvent('Unknown Event');
      const parsed = parseEventMeta(event);
      expect(parsed.type).toBe('other');
    });
  });

  describe('age tag extraction', () => {
    it('should extract U-age tags', () => {
      const event = mockEvent('12U Practice');
      const parsed = parseEventMeta(event);
      expect(parsed.ageTags).toContain('12U');
    });

    it('should extract grade range tags', () => {
      const event = mockEvent('FNH 3rd-4th Skills');
      const parsed = parseEventMeta(event);
      expect(parsed.ageTags).toContain('3-4th');
    });

    it('should extract single grade tags', () => {
      const event = mockEvent('5th grade practice');
      const parsed = parseEventMeta(event);
      expect(parsed.ageTags).toContain('5th');
    });

    it('should prefer grade ranges over single grades', () => {
      const event = mockEvent('3rd-4th grade clinic');
      const parsed = parseEventMeta(event);
      expect(parsed.ageTags).toContain('3-4th');
      expect(parsed.ageTags).not.toContain('3th');
    });
  });

  describe('team tag extraction', () => {
    it('should extract team with color', () => {
      const event = mockEvent('11U Red Practice');
      const parsed = parseEventMeta(event);
      expect(parsed.teamTags).toContain('11U Red');
    });

    it('should extract team without color', () => {
      const event = mockEvent('12U Practice');
      const parsed = parseEventMeta(event);
      expect(parsed.teamTags).toContain('12U');
    });

    it('should extract HS team', () => {
      const event = mockEvent('HS Black vs Northwood');
      const parsed = parseEventMeta(event);
      expect(parsed.teamTags).toContain('HS Black');
    });
  });

  describe('coach extraction', () => {
    it('should extract single coach', () => {
      const event = mockEvent('Skills — Coach Malia — Momentous');
      const parsed = parseEventMeta(event);
      expect(parsed.coaches).toContain('Malia');
    });

    it('should extract multiple coaches', () => {
      const event = mockEvent('Practice with Coach John & Coach Sarah');
      const parsed = parseEventMeta(event);
      expect(parsed.coaches).toContain('John');
      expect(parsed.coaches).toContain('Sarah');
    });

    it('should handle coaches with commas', () => {
      const event = mockEvent('Coach: John Smith, Sarah Johnson');
      const parsed = parseEventMeta(event);
      expect(parsed.coaches).toContain('John Smith');
      expect(parsed.coaches).toContain('Sarah Johnson');
    });
  });

  describe('basic fields', () => {
    it('should preserve basic event data', () => {
      const event = mockEvent('Test Event', 'Test Description', 'Test Location');
      const parsed = parseEventMeta(event);
      
      expect(parsed.id).toBe('test-id');
      expect(parsed.title).toBe('Test Event');
      expect(parsed.location).toBe('Test Location');
      expect(parsed.start).toBe('2024-01-15T10:00:00Z');
      expect(parsed.end).toBe('2024-01-15T11:00:00Z');
      expect(parsed.raw).toBe(event);
    });

    it('should handle missing fields gracefully', () => {
      const event = { id: 'test', start: { date: '2024-01-15' } };
      const parsed = parseEventMeta(event);
      
      expect(parsed.title).toBe('Untitled');
      expect(parsed.location).toBeUndefined();
      expect(parsed.coaches).toEqual([]);
      expect(parsed.ageTags).toEqual([]);
      expect(parsed.teamTags).toEqual([]);
    });
  });

  describe('complex real-world examples', () => {
    it('should parse FNH skills event correctly', () => {
      const event = mockEvent('FNH 3rd-4th Skills — Coach Malia — Momentous');
      const parsed = parseEventMeta(event);
      
      expect(parsed.type).toBe('skills');
      expect(parsed.ageTags).toContain('3-4th');
      expect(parsed.coaches).toContain('Malia');
    });

    it('should parse team practice correctly', () => {
      const event = mockEvent('11U Red Practice', '', 'Momentous Sports Center');
      const parsed = parseEventMeta(event);
      
      expect(parsed.type).toBe('practice');
      expect(parsed.teamTags).toContain('11U Red');
      expect(parsed.location).toBe('Momentous Sports Center');
    });

    it('should parse game with opponent correctly', () => {
      const event = mockEvent('HS Black vs Northwood (Game)');
      const parsed = parseEventMeta(event);
      
      expect(parsed.type).toBe('game');
      expect(parsed.teamTags).toContain('HS Black');
    });
  });
});
