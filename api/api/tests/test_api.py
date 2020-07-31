from pathlib import Path
from api import utils
import unittest
import copy


class Test_Age(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(Test_Age, self).__init__(*args, **kwargs)
        self.data = {
            'remove': {
                '(0010,0030)': '19800310',
                '(0008,0020)': '20100815',
            }
        }

    def test_age_calc(self):
        data = copy.copy(self.data)
        age = utils.calc_age(data)
        self.assertEqual(age, '30Y')

        data['remove']['(0008,0020)'] = '19810210'
        age = utils.calc_age(data)
        self.assertEqual(age, '11M')

        data['remove']['(0008,0020)'] = '19800406'
        age = utils.calc_age(data)
        self.assertEqual(age, '3W')

        data['remove']['(0008,0020)'] = '19800315'
        age = utils.calc_age(data)
        self.assertEqual(age, '5D')

        data['remove']['(0008,0020)'] = '19700310'
        age = utils.calc_age(data)
        self.assertEqual(age, '')

    def test_age_get_success(self):
        data = copy.copy(self.data)
        age_string = '045Y'
        data['remove']['(0010,1010)'] = age_string
        age = utils.calc_age(data)
        self.assertEqual(age, age_string)

    def test_age_calc_fail(self):
        data = copy.copy(self.data)
        del data['remove']['(0010,0030)']
        self.assertRaises(Exception, utils.calc_age, args=[data])

    def test_generalize_age_valid(self):
        def ae(pairs, step_size):
            for pair in pairs:
                self.assertEqual(utils.generalize_age(pair[0],
                                                      step_size=step_size),
                                 pair[1],
                                 msg='input={}'.format(pair[0]))

        pairs = [('045Y', '45'), ('032Y', '30'), ('010M', '0'), ('060M', '5'),
                 ('010W', '0'), ('06D', '0')]
        ae(pairs, 5)

        pairs = [('045Y', '50'), ('032Y', '30'), ('010M', '0'), ('060M', '10'),
                 ('010W', '0'), ('06D', '0')]
        ae(pairs, 10)

        pairs = [('045Y', '46'), ('032Y', '32'), ('010M', '0'), ('060M', '6'),
                 ('010W', '0'), ('06D', '0')]
        ae(pairs, 2)

    def test_generalize_age_invalid(self):
        for age_str in ['', ' ', 'Invalid', 'D', '12']:
            self.assertEqual(utils.generalize_age(age_str, step_size=5), '')
