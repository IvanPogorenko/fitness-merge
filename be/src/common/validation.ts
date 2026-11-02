import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';
import { isPositiveBigintString, toBigintString } from './bigint.js';

// Положительный bigint: десятичная строка (или безопасное целое number, приводимое к строке)
export function IsPositiveBigint(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPositiveBigint',
      validator: {
        validate: (value) => isPositiveBigintString(value),
        defaultMessage: buildMessage((prefix) => `${prefix}$property must be a positive bigint as a decimal string`, options),
      },
    },
    options,
  );
}

export function ToBigintString(): PropertyDecorator {
  return Transform(({ value }) => (Array.isArray(value) ? value.map(toBigintString) : toBigintString(value)));
}

export function Trim(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
}

// Проверка параметра пути :id / :videoId
@Injectable()
export class ParseBigintIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isPositiveBigintString(value)) {
      throw new BadRequestException('id must be a positive bigint as a decimal string');
    }
    return value;
  }
}
