import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { formatPhone } from '../lib/phone';
import type { CreateMemberDto, Member, MemberGender } from '../types';

interface MemberFormValues {
  name: string;
  gender: MemberGender | '';
  age: number | '';
  occupation: string;
  ptExperience: string;
  phone: string;
  memo: string;
}

const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;

const EMPTY: MemberFormValues = {
  name: '',
  gender: '',
  age: '',
  occupation: '',
  ptExperience: '',
  phone: '',
  memo: '',
};

function memberToFormValues(m: Member): MemberFormValues {
  return {
    name: m.name,
    gender: m.gender ?? '',
    age: m.age ?? '',
    occupation: m.occupation ?? '',
    ptExperience: m.ptExperience ?? '',
    phone: m.phone ?? '',
    memo: m.memo ?? '',
  };
}

export interface MemberFormModalProps {
  opened: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: Member | null;
  onSubmit: (dto: CreateMemberDto) => void;
  isSubmitting?: boolean;
}

export function MemberFormModal({
  opened,
  onClose,
  mode,
  initial,
  onSubmit,
  isSubmitting,
}: MemberFormModalProps) {
  const form = useForm<MemberFormValues>({
    initialValues: EMPTY,
    validate: {
      name: (v) => (v.trim().length ? null : '이름을 입력하세요'),
      age: (v) => {
        if (v === '' || v === null) return null;
        return v >= 1 && v <= 120 ? null : '1~120 사이의 값을 입력하세요';
      },
      phone: (v) => {
        const s = (v ?? '').trim();
        if (!s) return null;
        return PHONE_REGEX.test(s)
          ? null
          : '올바른 휴대폰 번호가 아닙니다 (예: 010-1234-5678)';
      },
    },
  });

  useEffect(() => {
    if (!opened) return;
    if (mode === 'edit' && initial) {
      form.setValues(memberToFormValues(initial));
    } else {
      form.setValues(EMPTY);
    }
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, mode, initial?.id]);

  const handleSubmit = (values: MemberFormValues) => {
    const dto: CreateMemberDto = {
      name: values.name.trim(),
      gender: values.gender || undefined,
      age: values.age === '' ? undefined : values.age,
      occupation: values.occupation.trim() || undefined,
      ptExperience: values.ptExperience.trim() || undefined,
      phone: values.phone.trim() || undefined,
      memo: values.memo.trim() || undefined,
    };
    onSubmit(dto);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'edit' ? '회원 정보 수정' : '회원 추가'}
      centered
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput label="이름" required {...form.getInputProps('name')} />
          <Group grow>
            <Select
              label="성별"
              placeholder="선택"
              clearable
              data={[
                { value: 'MALE', label: '남' },
                { value: 'FEMALE', label: '여' },
              ]}
              {...form.getInputProps('gender')}
            />
            <NumberInput
              label="나이"
              min={1}
              max={120}
              {...form.getInputProps('age')}
            />
          </Group>
          <TextInput
            label="직장"
            placeholder="예: 회사원, 학생, 자영업"
            {...form.getInputProps('occupation')}
          />
          <Textarea
            label="운동(PT) 경험"
            placeholder="예: PT 경험 없음 / 헬스 6개월 / 요가 1년"
            autosize
            minRows={2}
            {...form.getInputProps('ptExperience')}
          />
          <TextInput
            label="연락처"
            placeholder="010-0000-0000"
            inputMode="numeric"
            maxLength={13}
            {...form.getInputProps('phone')}
            onChange={(e) =>
              form.setFieldValue(
                'phone',
                formatPhone(e.currentTarget.value),
              )
            }
          />
          <Textarea
            label="기타 사항"
            placeholder="목표, 부상 이력, 식단 제한 등"
            autosize
            minRows={2}
            {...form.getInputProps('memo')}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {mode === 'edit' ? '저장' : '추가'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
