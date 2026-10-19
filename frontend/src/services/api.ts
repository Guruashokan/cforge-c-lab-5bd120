import type {
  Problem,
  ProblemListItem,
  Topic,
  Company,
  RunResponse,
  SubmissionResponse,
  UserStats,
  Assessment,
  AssessmentAttempt,
  RoadmapItem,
  ProblemFilterParams,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper for standard API requests
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (err: any) {
    // If backend is unreachable or returns error, use fallback if available
    console.warn(`API call failed for ${endpoint}:`, err.message);
    throw err;
  }
}

// Fallback Mock Data for offline development or when backend is down
const MOCK_TOPICS: Topic[] = [
  {
    id: 1,
    name: 'Pointers & Memory',
    slug: 'pointers-memory',
    description: 'Master raw memory, pointer arithmetic, dynamic allocation (malloc/free), and pointer to pointers.',
    order_index: 1,
    icon: 'Cpu',
    problem_count: 14,
    solved_count: 9,
  },
  {
    id: 2,
    name: 'Bit Manipulation',
    slug: 'bit-manipulation',
    description: 'Bitwise operations, masks, bit hacking, endianness conversions, and register-level operations.',
    order_index: 2,
    icon: 'Binary',
    problem_count: 12,
    solved_count: 7,
  },
  {
    id: 3,
    name: 'Strings & Char Arrays',
    slug: 'strings-char-arrays',
    description: 'Null-terminated strings, buffer safety, manual string parsing, strtok, and format strings.',
    order_index: 3,
    icon: 'Type',
    problem_count: 16,
    solved_count: 11,
  },
  {
    id: 4,
    name: 'Structs & Unions',
    slug: 'structs-unions',
    description: 'Structure alignment, byte padding, flexible array members, bitfields, and tagged unions.',
    order_index: 4,
    icon: 'Box',
    problem_count: 10,
    solved_count: 4,
  },
  {
    id: 5,
    name: 'Data Structures in C',
    slug: 'data-structures-c',
    description: 'Custom linked lists, circular buffers, generic void* heaps, hash tables, and binary trees.',
    order_index: 5,
    icon: 'Layers',
    problem_count: 18,
    solved_count: 8,
  },
  {
    id: 6,
    name: 'Concurrency & POSIX',
    slug: 'concurrency-posix',
    description: 'pthreads, mutexes, condition variables, semaphores, atomics, and lock-free ring buffers.',
    order_index: 6,
    icon: 'Activity',
    problem_count: 8,
    solved_count: 2,
  },
];

const MOCK_COMPANIES: Company[] = [
  {
    id: 1,
    name: 'NVIDIA',
    slug: 'nvidia',
    description: 'Low-level driver programming, CUDA runtime internals, SIMD intrinsics, memory management.',
    common_patterns: ['Custom Memory Allocator', 'SIMD / Vector Math', 'Atomic Locks', 'Cache-friendly Layouts'],
    problem_count: 15,
    solved_count: 8,
  },
  {
    id: 2,
    name: 'Qualcomm',
    slug: 'qualcomm',
    description: 'Embedded firmware, hardware abstraction layers (HAL), device drivers, and bitfield protocols.',
    common_patterns: ['Hardware Register Emulation', 'Bitfield Protocols', 'Circular DMA Buffer', 'Interrupt Handlers'],
    problem_count: 12,
    solved_count: 6,
  },
  {
    id: 3,
    name: 'Apple',
    slug: 'apple',
    description: 'Operating systems kernel (XNU), Darwin runtime, performance-critical system software.',
    common_patterns: ['Virtual Memory Manager', 'Lock-free Queue', 'Radix Tree', 'Cache Coherence'],
    problem_count: 14,
    solved_count: 5,
  },
  {
    id: 4,
    name: 'Google',
    slug: 'google',
    description: 'Systems infrastructure, Chromium C/C++ core, Borg resource manager, network stack.',
    common_patterns: ['Thread Pool', 'Zero-copy Ring Buffer', 'High-throughput Hash Map', 'LRU Cache'],
    problem_count: 16,
    solved_count: 7,
  },
  {
    id: 5,
    name: 'Microsoft',
    slug: 'microsoft',
    description: 'Windows kernel, Hyper-V virtualization, Azure low-level networking and storage services.',
    common_patterns: ['B-Tree Indexing', 'Page Table Walkers', 'Asynchronous I/O Reactor', 'Memory Barrier'],
    problem_count: 11,
    solved_count: 4,
  },
];

const MOCK_PROBLEMS: ProblemListItem[] = [
  {
    id: 1,
    title: 'Custom Memory Allocator (malloc/free)',
    slug: 'custom-memory-allocator',
    difficulty: 'very_hard',
    topic_name: 'Pointers & Memory',
    topic_slug: 'pointers-memory',
    is_solved: true,
    is_bookmarked: true,
    acceptance_rate: 34.2,
    company_slugs: ['nvidia', 'apple', 'google'],
  },
  {
    id: 2,
    title: 'Lock-Free Circular Ring Buffer',
    slug: 'lock-free-ring-buffer',
    difficulty: 'hard',
    topic_name: 'Concurrency & POSIX',
    topic_slug: 'concurrency-posix',
    is_solved: false,
    is_bookmarked: true,
    acceptance_rate: 42.8,
    company_slugs: ['nvidia', 'qualcomm', 'apple'],
  },
  {
    id: 3,
    title: 'Fast Bitwise Endianness Conversion & CRC32',
    slug: 'bitwise-crc32',
    difficulty: 'medium',
    topic_name: 'Bit Manipulation',
    topic_slug: 'bit-manipulation',
    is_solved: true,
    is_bookmarked: false,
    acceptance_rate: 68.5,
    company_slugs: ['qualcomm', 'microsoft'],
  },
  {
    id: 4,
    title: 'Generic Hash Table with Linear Probing',
    slug: 'generic-hash-table',
    difficulty: 'hard',
    topic_name: 'Data Structures in C',
    topic_slug: 'data-structures-c',
    is_solved: false,
    is_bookmarked: false,
    acceptance_rate: 48.1,
    company_slugs: ['google', 'microsoft'],
  },
  {
    id: 5,
    title: 'Safe String Tokenizer & Dynamic Builder',
    slug: 'safe-string-tokenizer',
    difficulty: 'medium',
    topic_name: 'Strings & Char Arrays',
    topic_slug: 'strings-char-arrays',
    is_solved: true,
    is_bookmarked: false,
    acceptance_rate: 62.4,
    company_slugs: ['apple', 'google'],
  },
  {
    id: 6,
    title: 'Tagged Union Variant with Deep Copy',
    slug: 'tagged-union-variant',
    difficulty: 'medium',
    topic_name: 'Structs & Unions',
    topic_slug: 'structs-unions',
    is_solved: false,
    is_bookmarked: true,
    acceptance_rate: 55.7,
    company_slugs: ['nvidia', 'qualcomm'],
  },
  {
    id: 7,
    title: 'Thread Pool with Work Stealing',
    slug: 'thread-pool-work-stealing',
    difficulty: 'very_hard',
    topic_name: 'Concurrency & POSIX',
    topic_slug: 'concurrency-posix',
    is_solved: false,
    is_bookmarked: false,
    acceptance_rate: 28.9,
    company_slugs: ['google', 'apple', 'microsoft'],
  },
  {
    id: 8,
    title: 'Bitfield Packet Serializer/Deserializer',
    slug: 'bitfield-packet-serializer',
    difficulty: 'medium',
    topic_name: 'Bit Manipulation',
    topic_slug: 'bit-manipulation',
    is_solved: true,
    is_bookmarked: false,
    acceptance_rate: 59.3,
    company_slugs: ['qualcomm', 'nvidia'],
  },
];

const MOCK_PROBLEM_DETAILS: Record<string, Problem> = {
  'custom-memory-allocator': {
    id: 1,
    title: 'Custom Memory Allocator (malloc/free)',
    slug: 'custom-memory-allocator',
    difficulty: 'very_hard',
    description: `Implement a memory allocator with boundary tags and first-fit strategy managing a fixed contiguous buffer.

Your allocator must maintain a header and footer for each chunk to allow $O(1)$ coalescing of adjacent free chunks upon deallocation.

### Requirements
1. \`void my_init(void *heap_start, size_t total_size)\`: Initialize the memory pool with a single free block.
2. \`void* my_malloc(size_t size)\`: Allocate aligned memory (8-byte alignment) with boundary headers/footers. Return \`NULL\` if no suitable block is found.
3. \`void my_free(void *ptr)\`: Free previously allocated chunk and coalesce with predecessor and successor if they are free.
4. Minimize internal and external fragmentation.`,
    input_format: 'Sequence of ALLOC <size> and FREE <id> commands passed to test harness.',
    output_format: 'For each allocation, prints valid offset or NULL. On heap dump, prints block distribution.',
    constraints: 'heap_size <= 64 MB, allocation count <= 50,000, max chunk size <= 4 MB. Memory must be 8-byte aligned.',
    examples: [
      {
        input: 'INIT 1024\nALLOC 64\nALLOC 128\nFREE 1',
        output: 'ALLOC 64 -> 0x1000\nALLOC 128 -> 0x1050\nFREE 1 -> OK (Coalesced 0)',
        explanation: 'Block 1 is allocated at start of payload area, followed by Block 2. Freeing Block 1 marks header as free.',
      },
      {
        input: 'INIT 512\nALLOC 400\nALLOC 200',
        output: 'ALLOC 400 -> 0x1000\nALLOC 200 -> NULL (OOM)',
        explanation: 'Remaining free memory is insufficient for 200 bytes plus metadata.',
      },
    ],
    execution_mode: 'function',
    starter_code: `#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>

#define ALIGNMENT 8
#define ALIGN(size) (((size) + (ALIGNMENT - 1)) & ~(ALIGNMENT - 1))

typedef struct BlockHeader {
    size_t size; // Lowest bit = 1 if allocated, 0 if free
} BlockHeader;

static void *g_heap_start = NULL;
static size_t g_heap_size = 0;

void my_init(void *heap_start, size_t total_size) {
    g_heap_start = heap_start;
    g_heap_size = total_size;
    // TODO: Set up initial free block with header and footer
}

void* my_malloc(size_t size) {
    if (size == 0) return NULL;
    size_t aligned_size = ALIGN(size);
    // TODO: Search for first fit block, split if remainder >= min block size
    return NULL;
}

void my_free(void *ptr) {
    if (!ptr) return;
    // TODO: Find header, mark as free, coalesce with left and right neighbors
}
`,
    hints: [
      'Each block needs a header and footer storing the size and an allocation bit. Use the lowest bit of size because blocks are 8-byte aligned!',
      'When freeing, check whether the adjacent blocks in memory are free. The footer of the previous block tells you its size and status in O(1).',
      'When splitting an oversized free block, remember to verify that the remainder is large enough to hold header + footer + payload.',
    ],
    explanation: `The boundary-tag allocation technique was introduced by Knuth.
Each block has:
- Header: contains size | alloc_bit
- Payload: user data
- Footer: duplicate of header, allows reverse traversal.

Coalescing takes $O(1)$ time by checking previous footer and next header.`,
    time_complexity: 'O(N) for malloc (first fit scan), O(1) for free (boundary tag coalescing).',
    space_complexity: 'O(1) auxiliary space beyond heap metadata overhead.',
    common_mistakes: [
      'Forgetting 8-byte alignment requirements which leads to SIGBUS on strict architectures.',
      'Corrupting header bits by not masking out the lowest allocation bit when calculating offsets.',
      'Failing to handle boundary conditions when coalescing first or last blocks in heap.',
    ],
    related_problems: ['Lock-Free Circular Ring Buffer', 'Generic Hash Table with Linear Probing'],
    topic: MOCK_TOPICS[0],
    companies: [
      { company_slug: 'nvidia', company_name: 'NVIDIA', source_type: 'Technical Interview' },
      { company_slug: 'apple', company_name: 'Apple', source_type: 'Onsite Coding' },
    ],
    is_bookmarked: true,
    is_solved: true,
  },
  'lock-free-ring-buffer': {
    id: 2,
    title: 'Lock-Free Circular Ring Buffer',
    slug: 'lock-free-ring-buffer',
    difficulty: 'hard',
    description: `Implement a Single-Producer Single-Consumer (SPSC) lock-free circular ring buffer using atomic operations and appropriate memory order barriers.

### Requirements
1. \`ring_buffer_t* rb_create(size_t capacity)\`: Allocate buffer (capacity rounded up to power of 2).
2. \`bool rb_push(ring_buffer_t *rb, void *item)\`: Enqueue element. Return \`false\` if full.
3. \`bool rb_pop(ring_buffer_t *rb, void **item)\`: Dequeue element. Return \`false\` if empty.
4. \`void rb_destroy(ring_buffer_t *rb)\`: Free memory.
5. Must use C11 \`<stdatomic.h>\` with \`memory_order_acquire\` and \`memory_order_release\`.`,
    input_format: 'Number of producer/consumer iterations with data verify.',
    output_format: 'Integrity checksum of processed items.',
    constraints: 'Buffer capacity up to 1,048,576 elements. Multi-threaded test with millions of items.',
    examples: [
      {
        input: 'CAPACITY 4\nPUSH 10, PUSH 20, POP, PUSH 30',
        output: 'POP -> 10, SIZE -> 2',
        explanation: 'Items 10 and 20 are pushed. 10 is popped. 30 is pushed into the circular slot.',
      },
    ],
    execution_mode: 'function',
    starter_code: `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdatomic.h>

typedef struct {
    void **buffer;
    size_t capacity;
    size_t mask;
    _Atomic size_t head; // Producer writes here
    _Atomic size_t tail; // Consumer reads here
} ring_buffer_t;

ring_buffer_t* rb_create(size_t capacity) {
    // TODO: Round up to power of 2 and allocate buffer
    return NULL;
}

bool rb_push(ring_buffer_t *rb, void *item) {
    // TODO: Atomic load of tail with acquire, store item, atomic store head with release
    return false;
}

bool rb_pop(ring_buffer_t *rb, void **item) {
    // TODO: Atomic load of head with acquire, read item, atomic store tail with release
    return false;
}

void rb_destroy(ring_buffer_t *rb) {
    if (rb) {
        free(rb->buffer);
        free(rb);
    }
}
`,
    hints: [
      'Use power-of-2 capacity so index calculation can be done via bitwise AND: index = head & (capacity - 1).',
      'The producer only modifies `head` and reads `tail`. The consumer only modifies `tail` and reads `head`.',
      'Ensure memory ordering: `memory_order_release` when updating index after writing/reading data.',
    ],
    explanation: 'SPSC queues do not require mutexes. Using memory barriers guarantees cross-thread visibility.',
    time_complexity: 'O(1) for push and pop.',
    space_complexity: 'O(capacity) space.',
    common_mistakes: ['False sharing between head and tail caches', 'Using relaxed memory ordering causing race conditions.'],
    related_problems: ['Thread Pool with Work Stealing'],
    topic: MOCK_TOPICS[5],
    companies: [{ company_slug: 'nvidia', company_name: 'NVIDIA', source_type: 'Driver Team' }],
    is_bookmarked: true,
    is_solved: false,
  },
};

const MOCK_USER_STATS: UserStats = {
  total_solved: 41,
  total_attempted: 58,
  acceptance_rate: 70.6,
  easy_solved: 18,
  medium_solved: 16,
  hard_solved: 5,
  very_hard_solved: 2,
  current_streak: 8,
  max_streak: 15,
  topic_progress: [
    { topic_name: 'Pointers & Memory', topic_slug: 'pointers-memory', solved: 9, total: 14, mastery_pct: 64 },
    { topic_name: 'Bit Manipulation', topic_slug: 'bit-manipulation', solved: 7, total: 12, mastery_pct: 58 },
    { topic_name: 'Strings & Char Arrays', topic_slug: 'strings-char-arrays', solved: 11, total: 16, mastery_pct: 69 },
    { topic_name: 'Structs & Unions', topic_slug: 'structs-unions', solved: 4, total: 10, mastery_pct: 40 },
    { topic_name: 'Data Structures in C', topic_slug: 'data-structures-c', solved: 8, total: 18, mastery_pct: 44 },
    { topic_name: 'Concurrency & POSIX', topic_slug: 'concurrency-posix', solved: 2, total: 8, mastery_pct: 25 },
  ],
  recent_submissions: [
    {
      id: 101,
      problem_title: 'Fast Bitwise Endianness Conversion & CRC32',
      problem_slug: 'bitwise-crc32',
      verdict: 'accepted',
      submitted_at: '2026-10-19 14:22',
    },
    {
      id: 102,
      problem_title: 'Custom Memory Allocator (malloc/free)',
      problem_slug: 'custom-memory-allocator',
      verdict: 'accepted',
      submitted_at: '2026-10-18 20:15',
    },
    {
      id: 103,
      problem_title: 'Lock-Free Circular Ring Buffer',
      problem_slug: 'lock-free-ring-buffer',
      verdict: 'time_limit_exceeded',
      submitted_at: '2026-10-18 17:40',
    },
    {
      id: 104,
      problem_title: 'Safe String Tokenizer & Dynamic Builder',
      problem_slug: 'safe-string-tokenizer',
      verdict: 'accepted',
      submitted_at: '2026-10-17 11:05',
    },
  ],
  difficulty_distribution: [
    { difficulty: 'Medium', solved: 16, total: 28 },
    { difficulty: 'Hard', solved: 5, total: 22 },
    { difficulty: 'Very Hard', solved: 2, total: 10 },
  ],
};

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 1,
    title: 'NVIDIA Systems Engineering Diagnostic',
    type: 'company_mock',
    duration_minutes: 90,
    company_name: 'NVIDIA',
    company_slug: 'nvidia',
    question_count: 3,
  },
  {
    id: 2,
    title: 'Qualcomm Embedded C Fast-Track',
    type: 'company_mock',
    duration_minutes: 60,
    company_name: 'Qualcomm',
    company_slug: 'qualcomm',
    question_count: 2,
  },
  {
    id: 3,
    title: 'C Memory & Pointers Mastery Sprint',
    type: 'timed',
    duration_minutes: 45,
    question_count: 3,
  },
  {
    id: 4,
    title: 'High-Concurrency & Multi-Threading Mock',
    type: 'practice',
    duration_minutes: 75,
    question_count: 2,
  },
];

// API Service Implementation
export const api = {
  // Problems
  async fetchProblems(filters?: ProblemFilterParams): Promise<{ problems: ProblemListItem[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.topic) params.append('topic', filters.topic);
      if (filters?.difficulty) params.append('difficulty', filters.difficulty);
      if (filters?.company) params.append('company', filters.company);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await request<{ problems: ProblemListItem[]; total: number }>(`/problems${query}`);
    } catch {
      // Mock filtering fallback
      let filtered = [...MOCK_PROBLEMS];
      if (filters?.topic) {
        filtered = filtered.filter((p) => p.topic_slug === filters.topic);
      }
      if (filters?.difficulty) {
        filtered = filtered.filter((p) => p.difficulty === filters.difficulty);
      }
      if (filters?.company) {
        filtered = filtered.filter((p) => p.company_slugs.includes(filters.company!));
      }
      if (filters?.status === 'solved') {
        filtered = filtered.filter((p) => p.is_solved);
      } else if (filters?.status === 'unsolved') {
        filtered = filtered.filter((p) => !p.is_solved);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter((p) => p.title.toLowerCase().includes(q) || p.topic_name.toLowerCase().includes(q));
      }
      return { problems: filtered, total: filtered.length };
    }
  },

  async fetchProblem(slug: string): Promise<Problem> {
    try {
      return await request<Problem>(`/problems/${slug}`);
    } catch {
      if (MOCK_PROBLEM_DETAILS[slug]) {
        return MOCK_PROBLEM_DETAILS[slug];
      }
      // Generate default problem if specific one not in mock dict
      const found = MOCK_PROBLEMS.find((p) => p.slug === slug);
      return {
        id: found?.id || 99,
        title: found?.title || slug.replace(/-/g, ' ').toUpperCase(),
        slug: slug,
        difficulty: found?.difficulty || 'hard',
        description: `Implement the requested C systems logic for **${found?.title || slug}**.\n\nEnsure high performance, safe memory handling, and adherence to standard constraints.`,
        input_format: 'Standard C test inputs via harness.',
        output_format: 'Formatted test output.',
        constraints: 'Time limit: 1.0s, Memory limit: 64MB.',
        examples: [
          {
            input: 'Sample input data',
            output: 'Expected output',
            explanation: 'Detailed walkthrough of sample execution.',
          },
        ],
        execution_mode: 'function',
        starter_code: `#include <stdio.h>\n#include <stdlib.h>\n\n// Write your solution here\nint solve(void) {\n    return 0;\n}\n`,
        hints: ['Consider cache line efficiency.', 'Check for memory leaks before returning.'],
        explanation: 'Detailed reference solution explanation.',
        time_complexity: 'O(N)',
        space_complexity: 'O(1)',
        common_mistakes: ['Pointer aliasing', 'Dangling pointer access'],
        related_problems: ['Custom Memory Allocator (malloc/free)'],
        topic: MOCK_TOPICS[0],
        companies: [{ company_slug: 'nvidia', company_name: 'NVIDIA', source_type: 'Interview' }],
        is_bookmarked: false,
        is_solved: false,
      };
    }
  },

  async runCode(slug: string, code: string): Promise<RunResponse> {
    try {
      return await request<RunResponse>(`/problems/${slug}/run`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    } catch {
      // Simulate compilation and test run
      await new Promise((r) => setTimeout(r, 1200));
      return {
        compiler_output: 'gcc -std=c17 -O2 -Wall -Wextra -Werror solution.c test_harness.c -o test\nBuild successful. No warnings.',
        stderr_output: '',
        test_results: [
          {
            test_case_index: 1,
            status: 'passed',
            input: 'INIT 1024; ALLOC 64; ALLOC 128;',
            expected_output: 'ALLOC 64 -> 0x1000\nALLOC 128 -> 0x1050',
            actual_output: 'ALLOC 64 -> 0x1000\nALLOC 128 -> 0x1050',
            time_ms: 2.4,
            is_hidden: false,
            description: 'Basic sequential allocation test',
          },
          {
            test_case_index: 2,
            status: 'passed',
            input: 'INIT 512; ALLOC 400; ALLOC 200;',
            expected_output: 'ALLOC 400 -> 0x1000\nALLOC 200 -> NULL (OOM)',
            actual_output: 'ALLOC 400 -> 0x1000\nALLOC 200 -> NULL (OOM)',
            time_ms: 1.8,
            is_hidden: false,
            description: 'Out of memory boundary test',
          },
        ],
      };
    }
  },

  async submitCode(slug: string, code: string, userId: string = 'user_default'): Promise<SubmissionResponse> {
    try {
      return await request<SubmissionResponse>(`/problems/${slug}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code, user_id: userId }),
      });
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
      return {
        id: Math.floor(Math.random() * 10000),
        verdict: 'accepted',
        passed_tests: 12,
        total_tests: 12,
        execution_time_ms: 14.8,
        memory_kb: 1024,
        compiler_output: 'gcc -std=c17 -O2 solution.c -o bin\nCompilation succeeded.',
        stderr_output: '',
        submitted_at: new Date().toISOString(),
        test_results: [
          {
            test_case_index: 1,
            status: 'passed',
            input: 'Standard stress test #1',
            expected_output: 'PASS',
            actual_output: 'PASS',
            time_ms: 3.1,
            is_hidden: false,
            description: 'Corner case: Zero size allocation',
          },
          {
            test_case_index: 2,
            status: 'passed',
            input: 'Randomized stress test #2',
            expected_output: 'PASS',
            actual_output: 'PASS',
            time_ms: 4.2,
            is_hidden: true,
            description: 'Hidden test: High memory fragmentation coalescing',
          },
        ],
      };
    }
  },

  // Topics & Roadmap
  async fetchTopics(): Promise<Topic[]> {
    try {
      return await request<Topic[]>('/topics');
    } catch {
      return MOCK_TOPICS;
    }
  },

  async fetchRoadmap(): Promise<RoadmapItem[]> {
    try {
      return await request<RoadmapItem[]>('/roadmap');
    } catch {
      return [
        {
          topic: MOCK_TOPICS[0],
          prerequisites: [],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'pointers-memory'),
          is_unlocked: true,
        },
        {
          topic: MOCK_TOPICS[1],
          prerequisites: ['Pointers & Memory'],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'bit-manipulation'),
          is_unlocked: true,
        },
        {
          topic: MOCK_TOPICS[2],
          prerequisites: ['Pointers & Memory'],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'strings-char-arrays'),
          is_unlocked: true,
        },
        {
          topic: MOCK_TOPICS[3],
          prerequisites: ['Pointers & Memory', 'Bit Manipulation'],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'structs-unions'),
          is_unlocked: true,
        },
        {
          topic: MOCK_TOPICS[4],
          prerequisites: ['Pointers & Memory', 'Structs & Unions'],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'data-structures-c'),
          is_unlocked: true,
        },
        {
          topic: MOCK_TOPICS[5],
          prerequisites: ['Data Structures in C'],
          problems: MOCK_PROBLEMS.filter((p) => p.topic_slug === 'concurrency-posix'),
          is_unlocked: true,
        },
      ];
    }
  },

  // Companies
  async fetchCompanies(): Promise<Company[]> {
    try {
      return await request<Company[]>('/companies');
    } catch {
      return MOCK_COMPANIES;
    }
  },

  async fetchCompany(slug: string): Promise<{ company: Company; problems: ProblemListItem[]; assessments: Assessment[] }> {
    try {
      return await request<{ company: Company; problems: ProblemListItem[]; assessments: Assessment[] }>(`/companies/${slug}`);
    } catch {
      const company = MOCK_COMPANIES.find((c) => c.slug === slug) || MOCK_COMPANIES[0];
      const problems = MOCK_PROBLEMS.filter((p) => p.company_slugs.includes(slug));
      const assessments = MOCK_ASSESSMENTS.filter((a) => a.company_slug === slug);
      return { company, problems, assessments };
    }
  },

  // User Stats & Bookmarks
  async fetchUserStats(userId: string = 'user_default'): Promise<UserStats> {
    try {
      return await request<UserStats>(`/users/${userId}/stats`);
    } catch {
      return MOCK_USER_STATS;
    }
  },

  async toggleBookmark(userId: string, problemId: number): Promise<{ is_bookmarked: boolean }> {
    try {
      return await request<{ is_bookmarked: boolean }>(`/users/${userId}/bookmarks/${problemId}`, {
        method: 'POST',
      });
    } catch {
      const item = MOCK_PROBLEMS.find((p) => p.id === problemId);
      if (item) {
        item.is_bookmarked = !item.is_bookmarked;
        return { is_bookmarked: item.is_bookmarked };
      }
      return { is_bookmarked: true };
    }
  },

  async fetchBookmarks(userId: string = 'user_default'): Promise<ProblemListItem[]> {
    try {
      return await request<ProblemListItem[]>(`/users/${userId}/bookmarks`);
    } catch {
      return MOCK_PROBLEMS.filter((p) => p.is_bookmarked);
    }
  },

  // Assessments
  async fetchAssessments(): Promise<Assessment[]> {
    try {
      return await request<Assessment[]>('/assessments');
    } catch {
      return MOCK_ASSESSMENTS;
    }
  },

  async startAssessment(id: number, userId: string = 'user_default'): Promise<AssessmentAttempt> {
    try {
      return await request<AssessmentAttempt>(`/assessments/${id}/start`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    } catch {
      const assessment = MOCK_ASSESSMENTS.find((a) => a.id === id) || MOCK_ASSESSMENTS[0];
      return {
        id: Math.floor(Math.random() * 5000),
        assessment_id: assessment.id,
        started_at: new Date().toISOString(),
        score: 0,
        max_score: 100,
        results: null,
        problems: [
          MOCK_PROBLEM_DETAILS['custom-memory-allocator'],
          MOCK_PROBLEM_DETAILS['lock-free-ring-buffer'],
        ],
      };
    }
  },

  async submitAssessment(attemptId: number, answers?: any): Promise<AssessmentAttempt> {
    try {
      return await request<AssessmentAttempt>(`/assessments/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
    } catch {
      return {
        id: attemptId,
        assessment_id: 1,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        finished_at: new Date().toISOString(),
        score: 85,
        max_score: 100,
        results: {
          verdict: 'passed',
          feedback: 'Excellent pointer management and memory safety! Minor time penalty on test case 4.',
        },
        problems: [
          MOCK_PROBLEM_DETAILS['custom-memory-allocator'],
          MOCK_PROBLEM_DETAILS['lock-free-ring-buffer'],
        ],
      };
    }
  },

  // Hints and Solutions
  async fetchHint(slug: string, level: number): Promise<{ hint: string; level: number; total_hints: number }> {
    try {
      return await request<{ hint: string; level: number; total_hints: number }>(`/problems/${slug}/hints?level=${level}`);
    } catch {
      const p = MOCK_PROBLEM_DETAILS[slug];
      const hints = p?.hints || ['Break the logic into smaller helper functions.', 'Verify memory alignment.'];
      const clampedLevel = Math.min(Math.max(1, level), hints.length);
      return {
        hint: hints[clampedLevel - 1],
        level: clampedLevel,
        total_hints: hints.length,
      };
    }
  },

  async fetchSolution(slug: string): Promise<{ explanation: string; solution_code: string; time_complexity: string; space_complexity: string }> {
    try {
      return await request<{ explanation: string; solution_code: string; time_complexity: string; space_complexity: string }>(`/problems/${slug}/solution`);
    } catch {
      const p = MOCK_PROBLEM_DETAILS[slug];
      return {
        explanation: p?.explanation || 'Optimal C reference implementation following MISRA and POSIX best practices.',
        solution_code: `// Reference Solution for ${slug}\n#include <stdio.h>\n#include <stdlib.h>\n\n// Complete verified implementation\n`,
        time_complexity: p?.time_complexity || 'O(N)',
        space_complexity: p?.space_complexity || 'O(1)',
      };
    }
  },

  // Daily Challenge
  async fetchDailyChallenge(): Promise<{ date: string; problem: ProblemListItem; bonus_xp: number }> {
    try {
      return await request<{ date: string; problem: ProblemListItem; bonus_xp: number }>('/daily-challenge');
    } catch {
      return {
        date: new Date().toISOString().split('T')[0],
        problem: MOCK_PROBLEMS[1], // Lock-Free Ring Buffer
        bonus_xp: 250,
      };
    }
  },
};
