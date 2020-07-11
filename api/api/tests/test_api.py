from pathlib import Path
from api import utils
import unittest
import copy


class Test_API(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(Test_API, self).__init__(*args, **kwargs)
        self.data = {
            'remove': {
                '(0010,0030)': '19800310',
                '(0008,0020)': '20100815',
            }
        }

    def test_age_calc(self):
        age = utils.calc_age(self.data)
        self.assertEqual(age, '30Y')

    def test_age_get(self):
        data = copy.copy(self.data)
        age_string = '045Y'
        data['remove']['(0010,1010)'] = age_string
        age = utils.calc_age(data)
        self.assertEqual(age, age_string)

    def test_age_fail(self):
        data = copy.copy(self.data)
        del data['remove']['(0010,0030)']
        self.assertRaises(Exception, utils.calc_age, args=[data])
