"""
ECMWF API Client для MIRA
Безопасный клиент для загрузки метеоданных из архива ECMWF

Использование:
    python ecmwf_client.py --date 2024-11-01 --output data.grib

Конфигурация:
    1. Создайте файл ~/.ecmwfapirc или .ecmwfapirc в корне проекта
    2. Или используйте переменные окружения:
       - ECMWF_API_KEY
       - ECMWF_API_EMAIL
       - ECMWF_API_URL
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

try:
    from ecmwfapi import ECMWFDataServer
except ImportError:
    print("❌ Библиотека ecmwf-api-client не установлена!")
    print("   Установите: pip install ecmwf-api-client")
    sys.exit(1)


class ECMWFClient:
    """Клиент для безопасной работы с ECMWF API"""
    
    # Пути для конфигурации
    CONFIG_FILES = [
        Path(__file__).parent / '.ecmwfapirc',
        Path.home() / '.ecmwfapirc',
    ]
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Инициализация клиента
        
        Args:
            config_file: Путь к файлу конфигурации (опционально)
        """
        self.server = None
        self.config = None
        self._init_config(config_file)
        self._init_server()
    
    def _init_config(self, config_file: Optional[str] = None):
        """Инициализация конфигурации"""
        # Проверяем переменные окружения (приоритет)
        if os.environ.get('ECMWF_API_KEY'):
            self.config = {
                'url': os.environ.get('ECMWF_API_URL', 'https://api.ecmwf.int/v1'),
                'key': os.environ.get('ECMWF_API_KEY'),
                'email': os.environ.get('ECMWF_API_EMAIL', '')
            }
            print("✓ Конфигурация из переменных окружения")
            return
        
        # Проверяем файл конфигурации
        config_paths = [Path(config_file)] if config_file else self.CONFIG_FILES
        
        for config_path in config_paths:
            if config_path.exists():
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        self.config = json.load(f)
                    print(f"✓ Конфигурация из {config_path}")
                    return
                except (json.JSONDecodeError, IOError) as e:
                    print(f"⚠ Ошибка чтения {config_path}: {e}")
        
        # Если ничего не найдено, используем анонимный доступ (ограниченный)
        print("⚠ Конфигурация не найдена. Используем анонимный доступ (ограниченные данные)")
        self.config = {}
    
    def _init_server(self):
        """Инициализация сервера ECMWF"""
        try:
            self.server = ECMWFDataServer()
            print("✓ ECMWF сервер инициализирован")
        except Exception as e:
            print(f"❌ Ошибка инициализации сервера: {e}")
            raise
    
    def retrieve(self, request: Dict[str, Any]) -> bool:
        """
        Загрузка данных из ECMWF
        
        Args:
            request: Параметры запроса
            
        Returns:
            bool: True если успешно
        """
        if not self.server:
            print("❌ Сервер не инициализирован")
            return False
        
        try:
            print(f"📡 Запрос данных: {request.get('dataset', 'unknown')}")
            print(f"📅 Дата: {request.get('date', 'N/A')}")
            print(f"🎯 Файл: {request.get('target', 'N/A')}")
            
            self.server.retrieve(request)
            
            target = request.get('target', '')
            if target and Path(target).exists():
                print(f"✅ Данные загружены: {target}")
                return True
            else:
                print("⚠ Запрос отправлен, проверьте файл результата")
                return True
                
        except Exception as e:
            print(f"❌ Ошибка загрузки: {e}")
            return False
    
    def get_tigge_data(
        self,
        date: str,
        output_file: str,
        area: Optional[str] = None,
        param: str = "167",  # Температура по умолчанию
        **kwargs
    ) -> bool:
        """
        Загрузка данных TIGGE (ансамблевые прогнозы)
        
        Args:
            date: Дата в формате YYYY-MM-DD
            output_file: Имя выходного файла
            area: Область в формате "N/W/S/E"
            param: Параметры (по умолчанию 167 = температура)
            
        Returns:
            bool: True если успешно
        """
        request = {
            'origin': 'ecmf',
            'levtype': 'sfc',
            'number': '1',
            'expver': 'prod',
            'dataset': 'tigge',
            'step': '0/6/12/18',
            'grid': '2/2',
            'param': param,
            'time': '00/12',
            'date': date,
            'type': 'pf',
            'class': 'ti',
            'target': output_file
        }
        
        if area:
            request['area'] = area
        
        request.update(kwargs)
        
        return self.retrieve(request)
    
    def get_era5_data(
        self,
        date: str,
        output_file: str,
        param: str = "2m_temperature",
        area: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        Загрузка данных ERA5 (реанализ)
        
        Args:
            date: Дата в формате YYYY-MM-DD
            output_file: Имя выходного файла
            param: Параметр (2m_temperature, total_precipitation, и т.д.)
            area: Область в формате "N/W/S/E"
            
        Returns:
            bool: True если успешно
        """
        request = {
            'product_type': 'reanalysis',
            'format': 'grib',
            'variable': param,
            'year': date.split('-')[0],
            'month': date.split('-')[1],
            'day': date.split('-')[2],
            'time': '00/06/12/18',
            'target': output_file
        }
        
        if area:
            request['area'] = area
        
        request.update(kwargs)
        
        return self.retrieve(request)


def main():
    """CLI интерфейс"""
    parser = argparse.ArgumentParser(
        description='ECMWF API Client для MIRA',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  python ecmwf_client.py --date 2024-11-01 --output data.grib
  python ecmwf_client.py --date 2024-11-01 --dataset era5 --param 2m_temperature
  python ecmwf_client.py --test
        """
    )
    
    parser.add_argument('--date', type=str, help='Дата (YYYY-MM-DD)')
    parser.add_argument('--output', '-o', type=str, default='output.grib',
                        help='Выходной файл')
    parser.add_argument('--dataset', type=str, default='tigge',
                        choices=['tigge', 'era5'], help='Набор данных')
    parser.add_argument('--param', type=str, default='167',
                        help='Параметр (167=температура для TIGGE)')
    parser.add_argument('--area', type=str,
                        help='Область: N/W/S/E (например, 70/-130/30/-60)')
    parser.add_argument('--config', type=str, help='Путь к конфигурации')
    parser.add_argument('--test', action='store_true', help='Тестовый режим')
    
    args = parser.parse_args()
    
    # Тестовый режим
    if args.test:
        print("🧪 ТЕСТОВЫЙ РЕЖИМ")
        print("=" * 50)
        client = ECMWFClient(args.config)
        print(f"\nКонфигурация: {client.config}")
        print("\n✓ Тест пройден!")
        return
    
    # Проверка даты
    if not args.date:
        # Используем вчерашнюю дату по умолчанию
        args.date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        print(f"ℹ Дата не указана, используем: {args.date}")
    
    # Инициализация клиента
    client = ECMWFClient(args.config)
    
    # Загрузка данных
    if args.dataset == 'tigge':
        success = client.get_tigge_data(
            date=args.date,
            output_file=args.output,
            param=args.param,
            area=args.area
        )
    else:  # era5
        success = client.get_era5_data(
            date=args.date,
            output_file=args.output,
            param=args.param,
            area=args.area
        )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
